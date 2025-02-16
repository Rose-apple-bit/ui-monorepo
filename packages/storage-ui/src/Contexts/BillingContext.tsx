import React, { useMemo } from "react"
import { useStorageApi } from "./StorageApiContext"
import { ReactNode, useEffect, useState } from "react"
import { Card, CurrentSubscription, InvoiceResponse, Product } from "@chainsafe/files-api-client"
import { useCallback } from "react"
import { t } from "@lingui/macro"
import { PaymentMethod as StripePaymentMethod } from "@stripe/stripe-js"
import { useStorage } from "./StorageContext"
import { useNotifications } from "./NotificationsContext"
import dayjs from "dayjs"
import { useHistory } from "@chainsafe/common-components"
import { ROUTE_LINKS } from "../Components/StorageRoutes"

export type PaymentMethod = "crypto" | "creditCard"

type BillingContextProps = {
  children: ReactNode | ReactNode[]
}

interface IBillingContext {
  defaultCard: Card | undefined
  refreshDefaultCard: () => void
  currentSubscription: CurrentSubscription | undefined
  changeSubscription: (newPriceId: string) => Promise<void>
  fetchCurrentSubscription: () => Promise<void | CurrentSubscription>
  getAvailablePlans: () => Promise<Product[]>
  deleteCard: (card: Card) => Promise<void>
  updateDefaultCard: (id: StripePaymentMethod["id"]) => Promise<void>
  invoices?: InvoiceResponse[]
  cancelCurrentSubscription: () => Promise<void>
  isPendingInvoice: boolean
  openInvoice?: InvoiceResponse
  downloadInvoice: (invoiceId: string) => Promise<void>
  refreshInvoices: () => void
  isBillingEnabled: boolean
}

const ProductMapping: {[key: string]: {
  name: string
  description: string
}} = {
  prod_JqS5E5vEhu95YG: {
    name: t`Free plan`,
    description: t`This is the free product.`
  },
  prod_L7wbvnjEoUQyat: {
    name: t`Storage Pro`,
    description: t`Storage Pro`
  },
  prod_LAqDoc8N18IOyp: {
    name: t`Storage Max`,
    description: t`Storage Max`
  }
}

const BillingContext = React.createContext<IBillingContext | undefined>(
  undefined
)

const BillingProvider = ({ children }: BillingContextProps) => {
  const { storageApiClient, isLoggedIn, accountRestricted } = useStorageApi()
  const { redirect } = useHistory()
  const { addNotification, removeNotification } = useNotifications()
  const { refreshBuckets } = useStorage()
  const [currentSubscription, setCurrentSubscription] = useState<CurrentSubscription | undefined>()
  const [defaultCard, setDefaultCard] = useState<Card | undefined>(undefined)
  const [invoices, setInvoices] = useState<InvoiceResponse[] | undefined>()
  const isPendingInvoice = useMemo(() => currentSubscription?.status === "pending_update", [currentSubscription])
  const openInvoice = useMemo(() => invoices?.find((i) => i.status === "open"), [invoices])
  const [restrictedNotification, setRestrictedNotification] = useState<string | undefined>()
  const [unpaidInvoiceNotification, setUnpaidInvoiceNotification] = useState<string | undefined>()
  const [cardExpiringNotification, setCardExpiringNotification] = useState<string | undefined>()
  const [isBillingEnabled, setIsBillingEnabled] = useState(false)

  const refreshInvoices = useCallback(() => {
    if (!currentSubscription) return

    storageApiClient.getAllInvoices(currentSubscription.id, 100)
      .then(({ invoices }) => {
        setInvoices(invoices.filter(i => i.status !== "void")
          .sort((a, b) => b.period_start - a.period_start))
      }).catch((err) => {
        console.error(err)
        setInvoices([])
      })
  }, [currentSubscription, storageApiClient])

  useEffect(() => {
    refreshInvoices()
  }, [refreshInvoices])

  useEffect(() => {
    if (!isLoggedIn) return

    storageApiClient.getEligibility()
      .then(res => setIsBillingEnabled(res.is_eligible))
      .catch(console.error)
  }, [storageApiClient, isLoggedIn])

  useEffect(() => {
    if (accountRestricted && !restrictedNotification) {
      const notif = addNotification({
        createdAt: dayjs().unix(),
        title: t`Account is restricted`,
        onClick: () => redirect(ROUTE_LINKS.SettingsPath("plan"))
      })
      setRestrictedNotification(notif)
    } else if (accountRestricted === false && restrictedNotification) {
      removeNotification(restrictedNotification)
      setRestrictedNotification(undefined)
    }
  }, [accountRestricted, addNotification, redirect, removeNotification, restrictedNotification])

  useEffect(() => {
    if (!!openInvoice && !unpaidInvoiceNotification) {
      const notif = addNotification({
        createdAt: openInvoice.period_start,
        title: t`Invoice outstanding`,
        onClick: () => redirect(ROUTE_LINKS.SettingsPath("plan"))
      })
      setUnpaidInvoiceNotification(notif)
    } else if (!openInvoice && unpaidInvoiceNotification) {
      removeNotification(unpaidInvoiceNotification)
      setUnpaidInvoiceNotification(undefined)
    }
  }, [addNotification, openInvoice, redirect, removeNotification, unpaidInvoiceNotification])

  useEffect(() => {
    if (defaultCard && currentSubscription) {
      if (!cardExpiringNotification && currentSubscription.expiry_date >
        dayjs(`${defaultCard.exp_year}-${defaultCard.exp_month}-01`, "YYYY-MM-DD").endOf("month").unix()) {
        const notif = addNotification({
          createdAt: dayjs().unix(),
          title: t`Credit Card is expiring soon`,
          onClick: () => redirect(ROUTE_LINKS.SettingsPath("plan"))
        })
        setCardExpiringNotification(notif)
      } else if (cardExpiringNotification && currentSubscription?.expiry_date <=
        dayjs(`${defaultCard?.exp_year}-${defaultCard?.exp_month}-01`, "YYYY-MM-DD").endOf("month").unix()) {
        removeNotification(cardExpiringNotification)
        setCardExpiringNotification(undefined)
      }
    }
  }, [addNotification, cardExpiringNotification, currentSubscription, defaultCard, redirect, removeNotification])

  const refreshDefaultCard = useCallback(() => {
    storageApiClient.getDefaultCard()
      .then((card) => {
        setDefaultCard(card)
      }).catch((err) => {
        console.error(err)
        setDefaultCard(undefined)
      })
  }, [storageApiClient])

  const deleteCard = useCallback((card: Card) =>
    storageApiClient.deleteCard(card.id)
  , [storageApiClient])

  useEffect(() => {
    if (isLoggedIn) {
      refreshDefaultCard()
    }
  }, [refreshDefaultCard, isLoggedIn, storageApiClient])

  const fetchCurrentSubscription = useCallback(() => {
    return storageApiClient.getCurrentSubscription()
      .then((subscription) => {
        subscription.product.name = ProductMapping[subscription.product.id].name
        subscription.product.description = ProductMapping[subscription.product.id].description
        setCurrentSubscription(subscription)
        return subscription
      })
      .catch(console.error)
  }, [storageApiClient])

  useEffect(() => {
    if (isLoggedIn && !currentSubscription) {
      fetchCurrentSubscription()
    } else if (!isLoggedIn) {
      setCurrentSubscription(undefined)
    }
  }, [isLoggedIn, fetchCurrentSubscription, currentSubscription])

  const getAvailablePlans = useCallback(() => {
    return storageApiClient.getAllProducts()
      .then((products) => {
        return products.map(product => {
          product.name = ProductMapping[product.id].name
          product.description = ProductMapping[product.id].description
          return product
        }).sort((a, b) => Number(a.prices[0].metadata?.storage_size_bytes) - Number(b.prices[0].metadata?.storage_size_bytes))
      })
      .catch((error: any) => {
        console.error(error)
        return []
      })
  }, [storageApiClient])

  const updateDefaultCard = useCallback((id: StripePaymentMethod["id"]) =>
    storageApiClient.updateDefaultCard({ id })
  , [storageApiClient])

  const changeSubscription = useCallback((newPriceId: string) => {
    if (!currentSubscription?.id) return Promise.resolve()
    return storageApiClient.updateSubscription(currentSubscription.id, {
      price_id: newPriceId,
      payment_method: "stripe"
    })
      .then(() => {
        fetchCurrentSubscription()
        refreshBuckets()
      })
      .catch((error) => {
        console.error(error)
        return Promise.reject(error)
      })
  }, [storageApiClient, currentSubscription, fetchCurrentSubscription, refreshBuckets])

  const cancelCurrentSubscription = useCallback(() => {
    if (!currentSubscription)
      return Promise.reject("There is no current subscription")

    return storageApiClient.cancelSubscription(currentSubscription.id)
      .then(() => {
        fetchCurrentSubscription()
        refreshBuckets()
      })
      .catch((error) => {
        console.error(error)
        return Promise.reject()
      })
  }, [currentSubscription, fetchCurrentSubscription, storageApiClient, refreshBuckets])

  const downloadInvoice = useCallback(async (invoiceId: string) => {
    try {
      const result = await storageApiClient.downloadInvoice(invoiceId)
      const link = document.createElement("a")
      link.href = URL.createObjectURL(result.data)
      link.download = "Chainsafe Files Invoice"
      link.click()
    } catch (error) {
      console.error(error)
    }
  }, [storageApiClient])

  return (
    <BillingContext.Provider
      value={{
        currentSubscription,
        fetchCurrentSubscription,
        changeSubscription,
        refreshDefaultCard,
        defaultCard,
        getAvailablePlans,
        deleteCard,
        updateDefaultCard,
        invoices,
        cancelCurrentSubscription,
        isPendingInvoice,
        downloadInvoice,
        refreshInvoices,
        openInvoice,
        isBillingEnabled
      }}
    >
      {children}
    </BillingContext.Provider>
  )
}

const useBilling = () => {
  const context = React.useContext(BillingContext)
  if (context === undefined) {
    throw new Error("useBilling must be used within a BillingProvider")
  }
  return context
}

export { BillingProvider, useBilling }
