import { createElement, useEffect, useState, type ComponentType } from "react"
import { BookOpen, Film, Image as ImageIcon, ListOrdered, LoaderCircle, Music, Presentation, Search, Volume2, X } from "lucide-react"
import { EmptyState, PageTitle, Skeleton } from "@/components/common/ui"
import { useCommand, usePermissions, useRemote } from "@/hooks/useRemoteState"
import { haptic } from "@/lib/haptics"
import { commandMessage } from "@/services/commandService"
import type { BibleCatalog, BibleVerse, CardsState, CommandName, LibraryItem, QueryName, SavedInService, SavedPassage } from "@/types/remote"

const SEARCH_DELAY_MS = 250
/** The desktop sends at most this many (REMOTE_LIST_LIMIT in MainFrame). */
const LIST_LIMIT = 200

/** Asks the desktop for a list, again whenever `key` changes, keeping the old answer of a slower request out. */
function useLibraryQuery<T>(name: QueryName | null, params: Record<string, unknown>, key: string) {
  const { provider } = useRemote()
  const [state, setState] = useState<{ key: string | null; data: T | null; error: string | null }>({ key: null, data: null, error: null })
  useEffect(() => {
    if (!name) {
      return
    }
    let current = true
    void provider.query(name, params).then((result) => {
      if (current) {
        setState({ key, data: result.ok ? (result.data as T) : null, error: result.ok ? null : commandMessage(result.code) })
      }
    })
    return () => {
      current = false
    }
    // params are described by key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, name, key])
  return { data: state.key === key ? state.data : null, error: state.key === key ? state.error : null, loading: state.key !== key }
}

const SELECT = "h-12 w-full min-w-0 rounded-xl border border-input bg-card px-3 text-base outline-none focus-visible:border-accent-brand"

function ChooserHeader({ title, onClose }: { title: string; onClose?: () => void }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2">
      <PageTitle>{title}</PageTitle>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Close list" className="flex size-11 items-center justify-center rounded-xl bg-secondary touch-manipulation">
          <X className="size-5" aria-hidden />
        </button>
      )}
    </div>
  )
}

interface ListProps {
  title: string
  query: QueryName
  /** What is saved of this kind in the service open on the desktop; shown first, unless searching. */
  savedQuery?: QueryName
  open: CommandName
  searchable?: boolean
  placeholder?: string
  icon: ComponentType<{ className?: string }>
  emptyTitle: string
  emptyText: string
  detail?: (item: LibraryItem) => string | null
  iconFor?: (item: LibraryItem) => ComponentType<{ className?: string }>
  onClose?: () => void
}

/** One item of a list. A tap opens it on the desktop. */
function ItemButton({ item, open, icon, detail, iconFor, onClose }: Pick<ListProps, "open" | "icon" | "detail" | "iconFor" | "onClose"> & { item: LibraryItem }) {
  const { commands } = useRemote()
  const { canControl } = usePermissions()
  const { run, busy } = useCommand()
  const sub = detail?.(item)
  return (
    <button
      type="button"
      disabled={!canControl || busy}
      onClick={async () => {
        haptic()
        const result = await run(() => commands.send(open, { id: item.id, title: item.title }))
        if (result.ok) {
          onClose?.()
        }
      }}
      className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left touch-manipulation disabled:opacity-60"
    >
      {busy ? <LoaderCircle className="size-5 shrink-0 animate-spin text-accent-brand" aria-hidden /> : createElement(iconFor?.(item) ?? icon, { className: "size-5 shrink-0 text-accent-brand" })}
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.title}</span>
        {sub && <span className="block truncate text-xs text-muted-foreground">{sub}</span>}
      </span>
    </button>
  )
}

/** A heading over what is saved in the open service, which comes before the whole library. */
function InServiceHeading({ service }: { service: string }) {
  return (
    <h3 className="flex shrink-0 items-center gap-2 text-sm font-semibold text-accent-brand">
      <ListOrdered className="size-4 shrink-0" aria-hidden />
      <span className="truncate">In This Service{service ? ` · ${service}` : ""}</span>
    </h3>
  )
}

/** A searchable list from the desktop's library. What is saved in the open service comes first. */
function LibraryList({ title, query, savedQuery, open, searchable = true, placeholder, icon, emptyTitle, emptyText, detail, iconFor, onClose }: ListProps) {
  const [text, setText] = useState("")
  const [search, setSearch] = useState("")
  const saved = useLibraryQuery<SavedInService<LibraryItem>>(savedQuery ?? null, {}, "saved")
  const row = { open, icon, detail, iconFor, onClose }
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [text])
  const { data, error, loading } = useLibraryQuery<LibraryItem[]>(query, { search }, search)

  return (
    <>
      <ChooserHeader title={title} onClose={onClose} />
      {searchable && (
        <div className="relative shrink-0">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-12 w-full rounded-xl border border-input bg-card pr-3 pl-10 text-base outline-none focus-visible:border-accent-brand"
          />
        </div>
      )}
      {!search && saved.data && saved.data.items.length > 0 && (
        <>
          <InServiceHeading service={saved.data.service} />
          <ul className="flex flex-col gap-2" aria-label="In This Service">
            {saved.data.items.map((item) => <li key={item.id}><ItemButton item={item} {...row} /></li>)}
          </ul>
          <h3 className="shrink-0 pt-1 text-sm font-semibold text-muted-foreground">All</h3>
        </>
      )}
      {error ? (
        <p role="alert" className="rounded-xl bg-live/15 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : loading ? (
        <Skeleton rows={4} />
      ) : !data || data.length === 0 ? (
        <EmptyState icon={icon} title={search ? "Nothing found" : emptyTitle}>{search ? `Nothing matches "${search}".` : emptyText}</EmptyState>
      ) : (
        <>
          <ul className="flex flex-col gap-2" aria-label={title}>
            {data.map((item) => <li key={item.id}><ItemButton item={item} {...row} /></li>)}
          </ul>
          {data.length >= LIST_LIMIT && (
            <p className="py-2 text-center text-sm text-muted-foreground">Showing the first {LIST_LIMIT}. Search to find the others.</p>
          )}
        </>
      )}
    </>
  )
}

export function SongPicker({ onClose }: { onClose?: () => void }) {
  return (
    <LibraryList title="Lyrics Library" query="SONGS" savedQuery="SERVICE_SONGS" open="OPEN_SONG" placeholder="Search songs" icon={Music}
      emptyTitle="No Songs" emptyText="Songs saved on the desktop appear here." onClose={onClose} />
  )
}

export function PresentationPicker({ onClose }: { onClose?: () => void }) {
  return (
    <LibraryList title="Presentations" query="PRESENTATIONS" savedQuery="SERVICE_PRESENTATIONS" open="OPEN_PRESENTATION" placeholder="Search presentations" icon={Presentation}
      emptyTitle="No Presentations" emptyText="PowerPoint files imported on the desktop appear here."
      detail={(p) => (p.slides ? `${p.slides} slides` : null)} onClose={onClose} />
  )
}

const MEDIA_ICONS: Record<string, ComponentType<{ className?: string }>> = { VIDEO: Film, AUDIO: Volume2, IMAGE: ImageIcon }

export function MediaPicker({ onClose }: { onClose?: () => void }) {
  return (
    <LibraryList title="Media Library" query="MEDIA_ITEMS" savedQuery="SERVICE_MEDIA" open="OPEN_MEDIA" placeholder="Search videos, audio, images" icon={Film}
      emptyTitle="No Media" emptyText="Videos, audio and images added on the desktop appear here."
      iconFor={(m) => MEDIA_ICONS[m.kind ?? ""] ?? Film} detail={(m) => m.kind?.toLowerCase() ?? null} onClose={onClose} />
  )
}

export function ServicePicker({ onClose }: { onClose?: () => void }) {
  return (
    <LibraryList title="Services" query="SERVICES" open="OPEN_SERVICE" searchable={false} icon={ListOrdered}
      emptyTitle="No Services" emptyText="Services saved on the desktop appear here." onClose={onClose} />
  )
}

/** Version, book and chapter, then a tap on a verse opens the whole chapter as cards, with that verse shown. */
export function BiblePicker({ onClose, current }: { onClose?: () => void; current?: CardsState | null }) {
  const { commands } = useRemote()
  const { canControl } = usePermissions()
  const { run, busy } = useCommand()
  const catalog = useLibraryQuery<BibleCatalog>("BIBLE_VERSIONS", {}, "catalog")
  const saved = useLibraryQuery<SavedInService<SavedPassage>>("SERVICE_BIBLE", {}, "saved")
  // starts where the desktop is, so changing verse does not mean finding the chapter again
  const [version, setVersion] = useState<string | null>(current?.translation ?? null)
  const [bookNumber, setBookNumber] = useState(current?.book ?? 43)
  const [chapter, setChapter] = useState(current?.chapter ?? 1)
  const chosenVersion = version ?? catalog.data?.versions[0]?.code ?? null
  const book = catalog.data?.books.find((b) => b.number === bookNumber)
  const verses = useLibraryQuery<BibleVerse[]>(chosenVersion ? "BIBLE_VERSES" : null, { version: chosenVersion, book: bookNumber, chapter }, `${chosenVersion}/${bookNumber}/${chapter}`)

  if (catalog.error) {
    return <p role="alert" className="rounded-xl bg-live/15 px-3 py-2 text-sm text-red-300">{catalog.error}</p>
  }
  if (catalog.loading || !catalog.data) {
    return <Skeleton rows={3} />
  }
  if (catalog.data.versions.length === 0) {
    return <EmptyState icon={BookOpen} title="No Bible Version">Connect a Bible version on the desktop first.</EmptyState>
  }
  return (
    <>
      <ChooserHeader title="Bible" onClose={onClose} />
      {saved.data && saved.data.items.length > 0 && (
        <>
          <InServiceHeading service={saved.data.service} />
          <ul className="flex flex-col gap-2" aria-label="In This Service">
            {saved.data.items.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  disabled={!canControl || busy}
                  onClick={async () => {
                    haptic()
                    const result = await run(() => commands.send("OPEN_BIBLE", { version: p.version, book: p.book, chapter: p.chapter, verse: p.verse, lastVerse: p.lastVerse }))
                    if (result.ok) {
                      onClose?.()
                    }
                  }}
                  className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 text-left font-medium touch-manipulation disabled:opacity-60"
                >
                  <BookOpen className="size-5 shrink-0 text-accent-brand" aria-hidden />
                  <span className="truncate">{p.title}</span>
                </button>
              </li>
            ))}
          </ul>
          <h3 className="shrink-0 pt-1 text-sm font-semibold text-muted-foreground">All</h3>
        </>
      )}
      <div className="grid shrink-0 grid-cols-[5.5rem_1fr_5rem] gap-2">
        <select aria-label="Version" className={SELECT} value={chosenVersion ?? ""} onChange={(e) => setVersion(e.target.value)}>
          {catalog.data.versions.map((v) => <option key={v.code} value={v.code}>{v.code}</option>)}
        </select>
        <select aria-label="Book" className={SELECT} value={bookNumber} onChange={(e) => { setBookNumber(Number(e.target.value)); setChapter(1) }}>
          {catalog.data.books.map((b) => <option key={b.number} value={b.number}>{b.name}</option>)}
        </select>
        <select aria-label="Chapter" className={SELECT} value={chapter} onChange={(e) => setChapter(Number(e.target.value))}>
          {Array.from({ length: book?.chapters ?? 1 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
        </select>
      </div>
      {verses.error ? (
        <p role="alert" className="rounded-xl bg-live/15 px-3 py-2 text-sm text-red-300">{verses.error}</p>
      ) : verses.loading ? (
        <Skeleton rows={4} />
      ) : !verses.data || verses.data.length === 0 ? (
        <EmptyState icon={BookOpen} title="No Verses">This version has no text for this chapter.</EmptyState>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Verses">
          {verses.data.map((v) => (
            <li key={v.verse}>
              <button
                type="button"
                disabled={!canControl || busy}
                onClick={async () => {
                  haptic()
                  const lastVerse = verses.data?.at(-1)?.verse ?? v.verse
                  const result = await run(() => commands.send("OPEN_BIBLE", { version: chosenVersion, book: bookNumber, bookName: book?.name, chapter, verse: v.verse, lastVerse }))
                  if (result.ok) {
                    onClose?.()
                  }
                }}
                className="flex w-full gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-left touch-manipulation disabled:opacity-60"
              >
                <span className="shrink-0 font-semibold text-accent-brand tabular-nums">{v.verse}</span>
                <span className="text-sm leading-snug">{v.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
