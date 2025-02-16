import React from "react"
import { init as initSentry, ErrorBoundary } from "@sentry/react"
import { Web3Provider } from "@chainsafe/web3-context"
import { ThemeSwitcher } from "@chainsafe/common-theme"
import "@chainsafe/common-theme/dist/font-faces.css"
import { CssBaseline, Router, ToastProvider } from "@chainsafe/common-components"
import { FilesProvider } from "./Contexts/FilesContext"
import FilesRoutes from "./Components/FilesRoutes"
import AppWrapper from "./Components/Layouts/AppWrapper"
import { LanguageProvider } from "./Contexts/LanguageContext"
import { ThresholdKeyProvider } from "./Contexts/ThresholdKeyContext"
import { lightTheme } from "./Themes/LightTheme"
import { darkTheme } from "./Themes/DarkTheme"
import { useLocalStorage } from "@chainsafe/browser-storage-hooks"
import { FilesApiProvider }  from "./Contexts/FilesApiContext"
import { UserProvider } from "./Contexts/UserContext"
import { BillingProvider } from "./Contexts/BillingContext"
import { PosthogProvider } from "./Contexts/PosthogContext"
import { NotificationsProvider } from "./Contexts/NotificationsContext"
import { StylesProvider, createGenerateClassName } from "@material-ui/styles"
import { HelmetProvider } from "react-helmet-async"

import ErrorModal from "./Components/Modules/ErrorModal"

// making material and jss use one className generator
const generateClassName = createGenerateClassName({
  productionPrefix: "c",
  disableGlobal: true
})

if (
  process.env.NODE_ENV === "production" &&
  process.env.REACT_APP_SENTRY_DSN_URL
) {
  initSentry({
    dsn: process.env.REACT_APP_SENTRY_DSN_URL,
    release: process.env.REACT_APP_SENTRY_RELEASE,
    environment: process.env.REACT_APP_SENTRY_ENV
  })
}

const availableLanguages = [
  { id: "de", label: "Deutsch" },
  { id: "en", label: "English" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "no", label: "Norsk" }
]

const onboardConfig = {
  dappId: process.env.REACT_APP_BLOCKNATIVE_ID || "",
  walletSelect: {
    wallets: [
      { walletName: "coinbase" },
      {
        walletName: "trust",
        rpcUrl:
          "https://mainnet.infura.io/v3/a7e16429d2254d488d396710084e2cd3"
      },
      { walletName: "metamask", preferred: true },
      { walletName: "authereum" },
      { walletName: "opera" },
      { walletName: "operaTouch" },
      { walletName: "torus" },
      { walletName: "status" },
      {
        walletName: "walletConnect",
        infuraKey: "a7e16429d2254d488d396710084e2cd3",
        preferred: true
      },
      { walletName: "detectedwallet" }
    ]
  }
}

const App = () => {
  const { canUseLocalStorage } = useLocalStorage()

  const apiUrl = process.env.REACT_APP_API_URL || "https://stage-api.chainsafe.io/api/v1"
  // This will default to testnet unless mainnet is specifically set in the ENV
  const directAuthNetwork = (process.env.REACT_APP_DIRECT_AUTH_NETWORK === "mainnet") ? "mainnet" : "testnet"

  return (
    <HelmetProvider>
      <StylesProvider generateClassName={generateClassName}>
        <ThemeSwitcher
          storageKey="csf.themeKey"
          themes={{ light: lightTheme, dark: darkTheme }}
        >
          <ErrorBoundary
            fallback={ErrorModal}
            onReset={() => window.location.reload()}
          >
            <CssBaseline />
            <LanguageProvider availableLanguages={availableLanguages}>
              <ToastProvider
                autoDismiss
                defaultPosition="bottomRight"
              >
                <Web3Provider
                  onboardConfig={onboardConfig}
                  checkNetwork={false}
                  cacheWalletSelection={canUseLocalStorage}
                  tokensToWatch={{
                    1: [
                      { address: "0x6b175474e89094c44da98b954eedeac495271d0f" },
                      { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" }
                    ]
                  }}
                >
                  <FilesApiProvider
                    apiUrl={apiUrl}
                    withLocalStorage={false}
                  >
                    <ThresholdKeyProvider
                      enableLogging={directAuthNetwork !== "mainnet"}
                      network={directAuthNetwork}
                    >
                      <Router>
                        <NotificationsProvider>
                          <UserProvider>
                            <FilesProvider>
                              <BillingProvider>
                                <PosthogProvider>
                                  <AppWrapper>
                                    <FilesRoutes />
                                  </AppWrapper>
                                </PosthogProvider>
                              </BillingProvider>
                            </FilesProvider>
                          </UserProvider>
                        </NotificationsProvider>
                      </Router>
                    </ThresholdKeyProvider>
                  </FilesApiProvider>
                </Web3Provider>
              </ToastProvider>
            </LanguageProvider>
          </ErrorBoundary>
        </ThemeSwitcher>
      </StylesProvider>
    </HelmetProvider>
  )
}

export default App
