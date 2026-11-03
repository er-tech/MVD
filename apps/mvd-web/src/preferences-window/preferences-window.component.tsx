import { Button, Dialog, Modal, ModalOverlay, Tab, TabList, TabPanel, Tabs } from 'react-aria-components'
import { layoutOf, orderDialogButtons, type ClassicTheme } from '../classic-themes'
import { TitleBar, useThemeOnRoot } from '../classic-window'
import type { ButtonSnapshot } from '../workspace-snapshot'
import { PreferenceField } from './preference-field.component'
import type { PreferencesIntent, PreferencesSnapshot } from './preferences-window.contract'

interface PreferencesWindowProps {
  theme:      ClassicTheme
  /** The theme's colour scheme; none for its first, the system's own. */
  scheme?:    string
  prefs:      PreferencesSnapshot
  onIntent:   (intent: PreferencesIntent) => void
  /** True when the page is a window of its own, which the window fills; false in a dialog over MVD's window. */
  ownWindow?: boolean
}

/**
 * The buttons at the bottom. Every setting is kept the moment it changes except the folder and
 * the file names, which wait for Save; so Save is there only while something waits, and
 * otherwise Close is the one way out.
 */
function buttonsFor (pending: boolean): ButtonSnapshot[] {
  return pending
    ? [
        { id: 'save', label: 'Save', role: 'default', enabled: true },
        { id: 'close', label: 'Close', role: 'cancel', enabled: true },
      ]
    : [{ id: 'close', label: 'Close', role: 'default', enabled: true }]
}

/**
 * The preferences, as a window of the theme: its tabs, the settings of the tab shown, what
 * happened last, and Save and Close where the system puts them. It draws what the program sends
 * and sends back each change; the program keeps the settings and runs what a button asks (the
 * folder chooser, moving or removing the app).
 */
export function PreferencesWindow ({ theme, scheme, prefs, onIntent, ownWindow = false }: PreferencesWindowProps) {
  useThemeOnRoot(theme, scheme)
  const layout = layoutOf(theme)
  const close = (): void => onIntent({ kind: 'prefs-close' })

  const dialog = (
    <Dialog className='preferences-dialog' aria-label={prefs.title}>
      <TitleBar title={prefs.title} layout={layout} controls={['close']} onWindow={close} />
      <div className='preferences-body' inert={prefs.busy}>
        {prefs.welcome && <p className='preferences-welcome'>{prefs.welcome}</p>}
        <Tabs
          className='preferences-tabs'
          selectedKey={String(prefs.tab)}
          onSelectionChange={key => onIntent({ kind: 'prefs-tab', index: Number(key) })}
        >
          <TabList className='preferences-tab-list' aria-label='Pages'>
            {prefs.tabs.map((tab, index) => <Tab key={tab} id={String(index)} className='preferences-tab'>{tab}</Tab>)}
          </TabList>
          <TabPanel id={String(prefs.tab)} className='preferences-page'>
            {prefs.fields.map((field, index) => field.hidden ? null : <PreferenceField key={field.label} field={field} index={index} onIntent={onIntent} />)}
          </TabPanel>
        </Tabs>
        <div className='preferences-footer'>
          <p className='preferences-status' data-bad={prefs.bad || undefined} role='status'>{prefs.status ?? (prefs.pending ? 'The folder and the file names are kept when you press Save.' : undefined)}</p>
          <div className='preferences-buttons'>
            {orderDialogButtons(buttonsFor(prefs.pending === true), layout).map(button => (
              <Button
                key={button.id}
                className='classic-button'
                data-role={button.role}
                onPress={() => onIntent({ kind: button.id === 'save' ? 'prefs-save' : 'prefs-close' })}
              >
                {button.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )

  // Its own window is closed by Esc as a dialog is, and has no overlay: the window is the frame.
  if (ownWindow) {
    return (
      <div
        className='preferences-window preferences-own-window'
        role='presentation'
        data-family={theme.family}
        onKeyDown={event => { if (event.key === 'Escape' && !event.defaultPrevented) close() }}
      >
        {dialog}
      </div>
    )
  }

  return (
    <ModalOverlay className='preferences-overlay' isOpen isDismissable={false} onOpenChange={open => { if (!open) close() }}>
      <Modal className='preferences-window' data-family={theme.family}>
        {dialog}
      </Modal>
    </ModalOverlay>
  )
}
