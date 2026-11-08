import { Box, ChakraProvider, Flex, Text, defaultSystem } from '@chakra-ui/react'
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { AboutModal } from '../about'
import { AddSourceModal } from '../addsource'
import type { Backend, ListInfo } from '../backend'
import { DetailsPanel } from '../details'
import type { Selection } from '../details'
import { LibraryStore } from '../library'
import { connectLibrary } from '../librarysync'
import { MetricsBar, usePageMetrics } from '../metrics'
import { PreferencesModal } from '../preferences'
import { QuitQuestionModal } from '../quitquestion'
import { RecoveryModal } from '../recovery'
import { ShortcutsModal } from '../shortcuts'
import { SongTable } from '../songtable'
import { SourceList } from '../sourcelist'
import { StatusBar } from '../statusbar'
import { Toolbar } from '../toolbar'
import { useAppActions } from './use-app-actions.hook.ts'
import type { ModalName } from './use-app-actions.hook.ts'
import { useTools } from './use-tools.hook.ts'

/**
 * The whole page: the toolbar, the sources on the left, the songs in the middle, the details of the
 * selection on the right, the status bar, and the windows. It holds only what the person chose (the
 * selection and the window that is open); everything else comes from the Go side.
 *
 * @param props.backend - the Go side.
 */
export function App ({ backend }: { backend: Backend }) {
  const [store] = useState(() => new LibraryStore())
  const run = useSyncExternalStore(store.subscribeRun, store.getRun)
  const tools = useTools(backend)
  const metrics = usePageMetrics(backend)
  const [selection, setSelection] = useState<Selection | undefined>()
  const [sourceId, setSourceId] = useState<string | undefined>()
  const [modal, setModal] = useState<ModalName | undefined>()
  const [notice, setNotice] = useState('')
  const [recovery, setRecovery] = useState<ListInfo | undefined>()

  useEffect(() => connectLibrary(backend, store), [backend, store])
  useEffect(() => {
    let current = true
    const look = async (): Promise<void> => {
      try {
        // A list the app was started with comes before the one the last run left.
        const startup = await backend.startupList()
        if (startup !== '') {
          await backend.openListPath(startup)

          return
        }
        const info = await backend.recovery()
        if (current) {
          setRecovery(info ?? undefined)
        }
      } catch (error) {
        // A list that cannot be read is not offered; one that cannot be opened is told.
        if (current) {
          setNotice(error instanceof Error ? error.message : String(error))
        }
      }
    }
    void look()

    return () => {
      current = false
    }
  }, [backend])
  useEffect(() => backend.onOpenFile(path => {
    const open = async (): Promise<void> => {
      try {
        await backend.openListPath(path)
      } catch (error) {
        setNotice(error instanceof Error ? error.message : String(error))
      }
    }
    void open()
  }), [backend])
  useEffect(() => backend.onCloseRequested(() => {
    setModal('quit')
  }), [backend])

  const closeModal = useCallback(() => {
    setModal(undefined)
  }, [])
  useAppActions({ backend, run, open: setModal, notify: setNotice, modalOpen: modal !== undefined || recovery !== undefined })

  const selectSource = useCallback((id: string) => {
    setSelection({ kind: 'source', id })
    setSourceId(id)
  }, [])
  const selectSong = useCallback((id: string) => {
    setSelection({ kind: 'song', id })
  }, [])
  const removeSource = useCallback(async (id: string) => {
    if (sourceId === id || selection?.id === id) {
      setSelection(undefined)
      setSourceId(undefined)
    }
    try {
      await backend.removeSource(id)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : String(error))
    }
  }, [backend, selection, sourceId])

  return (
    <ChakraProvider value={defaultSystem}>
      <Flex direction='column' h='100vh'>
        <Toolbar
          backend={backend} run={run} toolsReady={tools.ready} onAdd={() => {
            setModal('add')
          }} onError={setNotice}
        />
        <Flex flex='1' minH='0'>
          <Flex direction='column' w='260px' borderEndWidth='1px' minH='0'>
            <Box
              px='3'
              py='2'
              borderBottomWidth='1px'
              cursor='default'
              fontWeight='medium'
              bg={sourceId === undefined ? 'bg.emphasized' : undefined}
              onClick={() => {
                setSourceId(undefined)
                setSelection(undefined)
              }}
            >
              <Text>All songs</Text>
            </Box>
            <SourceList
              sources={store.sources} selected={sourceId} onSelect={selectSource} onRemove={id => {
                void removeSource(id)
              }}
            />
          </Flex>
          <SongTable
            songs={store.songs}
            sourceId={sourceId}
            selected={selection?.kind === 'song' ? selection.id : undefined}
            onSelect={selectSong}
          />
          <Flex direction='column' w='340px' borderStartWidth='1px' minH='0'>
            <DetailsPanel backend={backend} store={store} selection={selection} />
          </Flex>
        </Flex>
        <StatusBar
          run={run} tools={tools} notice={notice} onDismiss={() => {
            setNotice('')
          }}
        >
          <MetricsBar metrics={metrics} />
        </StatusBar>
      </Flex>
      <AddSourceModal open={modal === 'add'} backend={backend} onClose={closeModal} />
      <PreferencesModal open={modal === 'preferences'} backend={backend} onClose={closeModal} />
      <AboutModal open={modal === 'about'} backend={backend} onClose={closeModal} />
      <ShortcutsModal open={modal === 'shortcuts'} onClose={closeModal} />
      <QuitQuestionModal open={modal === 'quit'} backend={backend} onClose={closeModal} />
      {recovery !== undefined && (
        <RecoveryModal
          info={recovery} backend={backend} onClose={() => {
            setRecovery(undefined)
          }}
        />
      )}
    </ChakraProvider>
  )
}
