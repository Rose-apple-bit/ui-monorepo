import { Button, ShareAltSvg, Typography, Grid, TextInput, CrossIcon } from "@chainsafe/common-components"
import { createStyles, debounce, makeStyles, useOnClickOutside } from "@chainsafe/common-theme"
import React, { useState, useCallback, useRef, useEffect } from "react"
import { CSFTheme } from "../../../Themes/types"
import { BucketKeyPermission } from "../../../Contexts/FilesContext"
import CustomButton from "../../Elements/CustomButton"
import { t, Trans } from "@lingui/macro"
import { useCreateOrEditSharedFolder } from "./hooks/useCreateOrEditSharedFolder"
import { useLookupSharedFolderUser } from "./hooks/useLookupUser"
import { NonceResponsePermission, LookupUser } from "@chainsafe/files-api-client"
import clsx from "clsx"
import { Hashicon } from "@emeraldpay/hashicon-react"
import LinkList from "./Sharing/LinkList"
import PermissionsDropdown from "./Sharing/PermissionsDropdown"
import { UserName } from "../../Elements/UserName"

const useStyles = makeStyles(
  ({ breakpoints, constants, typography, palette }: CSFTheme) => {
    return createStyles({
      root: {
        padding: constants.generalUnit * 3,
        flexDirection: "column",
        display: "flex",
        alignItems: "center",
        [breakpoints.down("sm")]: {
          padding: constants.generalUnit * 3
        }
      },
      okButton: {
        marginLeft: constants.generalUnit
      },
      heading: {
        color: constants.modalDefault.color,
        fontWeight: typography.fontWeight.semibold,
        marginBottom: constants.generalUnit * 3
      },
      iconBacking: {
        backgroundColor: constants.modalDefault.iconBackingColor,
        width: 48,
        height: 48,
        borderRadius: 24,
        marginBottom: constants.generalUnit * 2,
        marginTop: constants.generalUnit,
        "& > svg": {
          width: 16,
          height: 16,
          fill: palette.primary.main,
          position: "relative",
          display: "block",
          transform: "translate(-50%, -50%)",
          top: "50%",
          left: "50%"
        }
      },
      inputLabel: {
        fontSize: 16,
        fontWeight: 600
      },
      footer: {
        width: "100%",
        paddingTop: constants.generalUnit * 2
      },
      options: {
        backgroundColor: constants.header.optionsBackground,
        color: constants.header.optionsTextColor,
        border: `1px solid ${constants.header.optionsBorder}`,
        minWidth: 145
      },
      dropdownTitle: {
        padding: `${constants.generalUnit * 0.75}px ${constants.generalUnit}px`,
        "& p": {
          fontSize: "16px"
        }
      },
      dropdownTitleWithBorders: {
        padding: `${constants.generalUnit * 0.75}px ${constants.generalUnit * 2}px`,
        "& p": {
          fontSize: "16px"
        }
      },
      permissionsInSuggestion: {
        minWidth: 110
      },
      userNameSuggest: {
        position: "relative",
        width: "100%",
        margin: 5
      },
      suggestionsDropDown: {
        position: "absolute",
        width: "100%",
        backgroundColor: palette.additional["gray"][1],
        border: `1px solid ${palette.additional["gray"][5]}`,
        zIndex: 100
      },
      suggestionsBody: {
        width: "100%",
        padding: constants.generalUnit * 2
      },
      usernameBox: {
        color: palette.additional["gray"][9],
        padding: constants.generalUnit * 2,
        cursor: "pointer",
        ...typography.body1,
        fontSize: "16px",
        textOverflow: "ellipsis",
        overflow: "hidden",
        "&:hover": {
          backgroundColor: palette.additional["blue"][1]
        }
      },
      usernameTextInput: {
        margin: "0px !important",
        width: "100%",
        "& input": {
          border: "0px",
          "&:focus": {
            border: "0px"
          }
        }
      },
      usernameDropdownWrapper: {
        display: "flex",
        width: "100%",
        justifyContent: "center",
        alignItems: "center",
        border: `1px solid ${palette.additional["gray"][6]}`,
        borderRadius: "2px",
        "&.focus": {
          borderColor: palette.primary.border,
          boxShadow: "0px 0px 4px rgba(24, 144, 255, 0.5)"
        }
      },
      subtitle: {
        color: palette.additional["gray"][7]
      },
      usersWrapper: {
        margin: `${constants.generalUnit * 1.5}px 0`,
        width: "100%"
      },
      addedUserBox: {
        display: "flex",
        width: "100%",
        justifyContent: "space-between",
        padding: `${constants.generalUnit * 0.5}px 0px ${constants.generalUnit * 0.5}px ${constants.generalUnit}px`
      },
      addedUserLabel: {
        fontSize: "16px",
        fontWeight: 600,
        overflow: "hidden",
        textOverflow: "ellipsis"
      },
      hashIcon: {
        marginRight: constants.generalUnit * 2,
        marginTop: constants.generalUnit
      },
      flexContainer: {
        display: "flex",
        alignItems: "center",
        maxWidth: "calc(100% - 150px)"
      },
      crossButton: {
        padding: "0px !important",
        "& svg": {
          fill: palette.additional["gray"][7]
        }
      },
      crossIcon: {
        fontSize: "22px"
      },
      linksContainer: {
        width: "100%"
      }
    })
  }
)

interface ICreateOrManageSharedFolderProps {
  onClose: () => void
  bucketToEdit?: BucketKeyPermission
}

const ManageSharedFolder = ({ onClose, bucketToEdit }: ICreateOrManageSharedFolderProps) => {
  const classes = useStyles()
  const { handleEditSharedFolder, isEditingSharedFolder, isCreatingSharedFolder } = useCreateOrEditSharedFolder()
  const { sharedFolderReaders,
    sharedFolderWriters,
    onAddNewUser,
    setSharedFolderReaders,
    setSharedFolderWriters,
    handleLookupUser,
    resetUsers
  } = useLookupSharedFolderUser()
  const [hasPermissionsChanged, setHasPermissionsChanged] = useState(false)
  const [newUserPermission, setNewUserPermission] = useState<NonceResponsePermission>("read")
  const [usernameSearch, setUsernameSearch] = useState<string | undefined>()
  const [suggestedUsers, setSuggestedUsers] = useState<LookupUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [searchActive, setSearchActive] = useState(false)
  const [touchedLinksList, setTouchedLinksList] = useState(false)

  const onReset = useCallback(() => {
    setHasPermissionsChanged(false)
    resetUsers()
  }, [resetUsers])

  useEffect(() => {
    onReset()

    if (!bucketToEdit) return

    setSharedFolderReaders(bucketToEdit.readers)
    setSharedFolderWriters(bucketToEdit.writers)
  }, [bucketToEdit, setSharedFolderReaders, setSharedFolderWriters, onReset])

  const handleClose = useCallback(() => {
    onReset()
    onClose()
  }, [onClose, onReset])

  const onEditSharedFolder = useCallback(() => {
    if (!bucketToEdit) return

    // only sharing link where touched no need to call the api
    // just close the modal
    if (!hasPermissionsChanged) {
      handleClose()
      return
    }

    handleEditSharedFolder(bucketToEdit, sharedFolderReaders, sharedFolderWriters)
      .catch(console.error)
      .finally(handleClose)
  }, [bucketToEdit, hasPermissionsChanged, handleEditSharedFolder, sharedFolderReaders, sharedFolderWriters, handleClose])

  const onLookupUser = (inputText?: string) => {
    if (!inputText) return
    handleLookupUser(inputText)
      .then(setSuggestedUsers)
      .catch(console.error)
      .finally(() => setLoadingUsers(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedHandleLookupUser = useCallback(debounce(onLookupUser, 400), [handleLookupUser])

  const onUsernameChange = (v?: string | number) => {
    setLoadingUsers(true)
    setUsernameSearch(v?.toString())
    debouncedHandleLookupUser(v?.toString())
  }

  const ref = useRef(null)
  useOnClickOutside(ref, () => {
    if (searchActive) {
      setSearchActive(false)
    }
  })

  const onSuggestedUserClick = useCallback((user: LookupUser) => {
    onAddNewUser(user, newUserPermission)
    setSearchActive(false)
    setUsernameSearch("")
    setSuggestedUsers([])
    setHasPermissionsChanged(true)
  }, [newUserPermission, onAddNewUser])

  return (
    <div className={classes.root}>
      <div className={classes.iconBacking}>
        <ShareAltSvg />
      </div>
      <div className={classes.heading}>
        <Typography className={classes.inputLabel}>
          <Trans>Manage Shared Folder</Trans>
        </Typography>
      </div>
      <div
        className={classes.userNameSuggest}
        ref={ref}
        onClick={() => { !searchActive && setSearchActive(true) }}
      >
        <div className={clsx(classes.usernameDropdownWrapper, searchActive && "focus")}>
          <TextInput
            placeholder={t`Username, wallet address or ENS`}
            size="large"
            value={usernameSearch}
            onChange={onUsernameChange}
            className={classes.usernameTextInput}
            onFocus={() => setSearchActive(true)}
            data-cy="input-edit-permission"
          />
          <PermissionsDropdown
            selectedPermission={newUserPermission}
            onViewPermissionClick={() => setNewUserPermission("read")}
            onEditPermissionClick={() => setNewUserPermission("write")}
            permissions={["read", "write"]}
            injectedClasses={{
              root: classes.permissionsInSuggestion,
              options: classes.options,
              dropdownTitle: classes.dropdownTitle
            }}
            withBorders={false}
          />
        </div>
        {(!!usernameSearch && searchActive) && <div className={classes.suggestionsDropDown}>
          {suggestedUsers.length
            ? <div>
              {suggestedUsers.map((u) => <div
                key={u.uuid}
                className={classes.usernameBox}
                onClick={() => {onSuggestedUserClick(u)}}
                data-cy="user-lookup-result"
              >
                <UserName user={u}/>
              </div>)
              }
            </div>
            : <div className={classes.suggestionsBody}>
              <Typography
                component="p"
                variant="body1"
                className={classes.subtitle}
              >
                {loadingUsers
                  ? <Trans>Loading...</Trans>
                  : <Trans>No user found</Trans>
                }
              </Typography>
            </div>
          }
        </div>
        }
      </div>
      <div className={classes.usersWrapper}>
        {[
          ...sharedFolderReaders.map((sr) => ({ user: sr, permission: "read" as NonceResponsePermission })),
          ...sharedFolderWriters.map((sw) => ({ user: sw, permission: "write" as NonceResponsePermission }))
        ].map((sharedFolderUser) => <div
          key={sharedFolderUser.user.uuid}
          className={classes.addedUserBox}
          data-cy="container-added-user"
        >
          <div className={classes.flexContainer}>
            <div
              className={classes.hashIcon}
              data-cy="container-user-icon"
            >
              <Hashicon
                value={sharedFolderUser.user.uuid}
                size={28}
              />
            </div>
            <Typography
              className={classes.addedUserLabel}
              component="p"
              data-cy="label-added-user"
            >
              <UserName user={sharedFolderUser.user}/>
            </Typography>
          </div>
          <div className={classes.flexContainer}>
            <PermissionsDropdown
              testId="user-permission"
              selectedPermission={sharedFolderUser.permission}
              onViewPermissionClick={() => {
                if (sharedFolderUser.permission === "write") {
                  setHasPermissionsChanged(true)
                  setSharedFolderWriters(sharedFolderWriters.filter((user) => sharedFolderUser.user.uuid !== user.uuid))
                  setSharedFolderReaders([...sharedFolderReaders, sharedFolderUser.user])
                }
              }}
              onEditPermissionClick={() => {
                if (sharedFolderUser.permission === "read") {
                  setHasPermissionsChanged(true)
                  setSharedFolderReaders(sharedFolderReaders.filter((user) => sharedFolderUser.user.uuid !== user.uuid))
                  setSharedFolderWriters([...sharedFolderWriters, sharedFolderUser.user])
                }
              }}
              injectedClasses={{
                options: classes.options,
                dropdownTitle: classes.dropdownTitleWithBorders
              }}
              permissions={["read", "write"]}
              withBorders={true}
            />
            <Button
              variant="link"
              className={classes.crossButton}
              testId="remove-user-from-share"
              onClick={() => {
                setHasPermissionsChanged(true)
                if (sharedFolderUser.permission === "read") {
                  setSharedFolderReaders(sharedFolderReaders.filter((r) => r.uuid !== sharedFolderUser.user.uuid))
                }
                else if (sharedFolderUser.permission === "write") {
                  setSharedFolderWriters(sharedFolderWriters.filter((w) => w.uuid !== sharedFolderUser.user.uuid))
                }
              }}
            >
              <CrossIcon className={classes.crossIcon} />
            </Button>
          </div>
        </div>)}
      </div>
      {!!bucketToEdit && <div className={classes.linksContainer}>
        <LinkList
          bucketEncryptionKey={bucketToEdit.encryptionKey}
          bucketId={bucketToEdit.id}
          setTouchedLinksList={() => setTouchedLinksList(true)}
        />
      </div>}
      <Grid
        item
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        className={classes.footer}
      >
        <Grid
          item
          flexDirection="row"
          justifyContent="flex-end"
        >
          <CustomButton
            onClick={handleClose}
            size="large"
            variant="outline"
            type="button"
            data-cy="button-close-manage-shared-folder"
          >
            <Trans>Close</Trans>
          </CustomButton>
          <Button
            variant="primary"
            size="large"
            type="submit"
            className={classes.okButton}
            loading={isCreatingSharedFolder || isEditingSharedFolder}
            onClick={onEditSharedFolder}
            disabled={!touchedLinksList && (!hasPermissionsChanged || isEditingSharedFolder)}
            data-cy="button-update-shared-folder"
          >
            <Trans>Update</Trans>
          </Button>
        </Grid>
      </Grid>
    </div>
  )
}

export default ManageSharedFolder
