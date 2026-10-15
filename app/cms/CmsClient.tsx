"use client"

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

type GalleryItem = {
  id: string
  title: string
  client: string
  categories: string[]
  thumbnail: string
  full: string
  order: number
  published: boolean
}

type UploadFile = {
  id: string
  originalName: string
  full: string
  thumbnail: string
  title: string
}

const FILTERS = [
  "Figma",
  "Photoshop",
  "Branding",
  "After Effects",
  "Illustrator",
  "DTP",
  "Project management",
]

type View = "list" | "grid" | "edit" | "upload"

function Icon({
  name,
}: {
  name: "list" | "grid" | "edit" | "trash" | "upload" | "back"
}) {
  const paths = {
    list: (
      <>
        <path d="M8 6h12M8 12h12M8 18h12" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" />
        <rect x="14" y="4" width="6" height="6" />
        <rect x="4" y="14" width="6" height="6" />
        <rect x="14" y="14" width="6" height="6" />
      </>
    ),
    edit: <path d="M4 20h4l11-11-4-4L4 16v4Zm9-13 4 4" />,
    trash: (
      <>
        <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" />
        <path d="M10 11v5M14 11v5" />
      </>
    ),
    upload: (
      <>
        <path d="M12 16V4M7 9l5-5 5 5" />
        <path d="M5 14v5h14v-5" />
      </>
    ),
    back: <path d="M15 18l-6-6 6-6" />,
  }

  return (
    <svg
      className="ui-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  )
}

export default function CmsClient() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [view, setView] = useState<View>("list")
  const [previousView, setPreviousView] = useState<"list" | "grid">("list")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [uploads, setUploads] = useState<UploadFile[]>([])
  const [uploadClient, setUploadClient] = useState("")
  const [uploadCategories, setUploadCategories] = useState<string[]>([])
  const [busy, setBusy] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setBusy(true)
    const response = await fetch("/api/gallery", { cache: "no-store" })

    if (response.ok) {
      const data = await response.json()
      setItems(
        [...(data.items || [])].sort(
          (a: GalleryItem, b: GalleryItem) => a.order - b.order
        )
      )
    }

    setBusy(false)
  }

  async function publish(nextItems = items) {
    setSaving(true)
    setMessage("")

    const response = await fetch("/api/gallery", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: nextItems }),
    })

    setSaving(false)

    if (!response.ok) {
      setMessage("Nie udało się zapisać zmian")
      return false
    }

    setMessage("Opublikowano")
    setTimeout(() => setMessage(""), 1800)
    return true
  }

  function switchBaseView(next: "list" | "grid") {
    setPreviousView(next)
    setView(next)
  }

  function startEdit(id: string) {
    setEditingId(id)
    setView("edit")
  }

  function toggleCategory(category: string, current: string[]) {
    return current.includes(category)
      ? current.filter((item) => item !== category)
      : [...current, category]
  }

  function updateEditing(patch: Partial<GalleryItem>) {
    if (!editingId) return

    setItems((current) =>
      current.map((item) =>
        item.id === editingId ? { ...item, ...patch } : item
      )
    )
  }

  async function deleteItem(item: GalleryItem) {
    if (!window.confirm(`Usunąć „${item.title || item.client || item.id}”?`)) {
      return
    }

    const response = await fetch(
      `/api/gallery?id=${encodeURIComponent(item.id)}`,
      { method: "DELETE" }
    )

    if (response.ok) {
      const data = await response.json()
      setItems(data.items || [])
    }
  }

  function onDragStart(index: number) {
    setDragIndex(index)
  }

  function onDragOver(event: DragEvent, targetIndex: number) {
    event.preventDefault()

    if (dragIndex === null || dragIndex === targetIndex) return

    setItems((current) => {
      const copy = [...current]
      const [moved] = copy.splice(dragIndex, 1)
      copy.splice(targetIndex, 0, moved)

      return copy.map((item, index) => ({
        ...item,
        order: index + 1,
      }))
    })

    setDragIndex(targetIndex)
  }

  async function acceptFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/")
    )

    if (!files.length) return

    setSaving(true)

    const form = new FormData()
    files.forEach((file) => form.append("files", file))

    const response = await fetch("/api/upload", {
      method: "POST",
      body: form,
    })

    setSaving(false)

    if (!response.ok) {
      setMessage("Upload nie powiódł się")
      return
    }

    const data = await response.json()

    setUploads((current) => [
      ...current,
      ...data.files.map((file: UploadFile) => ({
        ...file,
        title: file.originalName.replace(/\.[^.]+$/, ""),
      })),
    ])

    setView("upload")
  }

  async function addUploadedItems() {
    const start = items.length

    const newItems: GalleryItem[] = uploads.map((file, index) => ({
      id: file.id,
      title: file.title,
      client: uploadClient,
      categories: uploadCategories,
      thumbnail: file.thumbnail,
      full: file.full,
      order: start + index + 1,
      published: true,
    }))

    const next = [...items, ...newItems]
    setItems(next)

    const ok = await publish(next)

    if (ok) {
      setUploads([])
      setUploadClient("")
      setUploadCategories([])
      setView(previousView)
    }
  }

  const editing = useMemo(
    () => items.find((item) => item.id === editingId) || null,
    [items, editingId]
  )

  if (busy) {
    return (
      <main className="cms-shell loading-shell">
        <div className="loading-dot" />
        Loading gallery…
      </main>
    )
  }

  return (
    <main className="cms-shell">
      <header className="cms-header">
        <button className="brand small" onClick={() => setView(previousView)}>
          DEMIGOD
        </button>

        <div className="header-actions">
          {view !== "upload" && (
            <button
              className="button button-secondary"
              onClick={() => setView("upload")}
            >
              Upload files
            </button>
          )}

          {(view === "list" || view === "grid") && (
            <button
              className="button button-primary"
              onClick={() => publish()}
              disabled={saving}
            >
              {saving ? "Publishing…" : "Publish changes"}
            </button>
          )}

          {view === "edit" && (
            <button
              className="button button-primary"
              onClick={async () => {
                if (await publish()) setView(previousView)
              }}
              disabled={saving}
            >
              Save changes
            </button>
          )}

          <form action="/api/logout" method="post">
            <button className="logout-link">logout</button>
          </form>
        </div>
      </header>

      {message && <div className="toast">{message}</div>}

      {(view === "list" || view === "grid") && (
        <section className="gallery-admin">
          <div className="section-head">
            <h1>Portfolio Gallery</h1>

            <button
              className="view-switch"
              onClick={() =>
                switchBaseView(view === "list" ? "grid" : "list")
              }
            >
              <Icon name="list" />
              <Icon name="grid" />
              <span>zmień widok</span>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty-admin">
              <h2>Galeria jest pusta</h2>
              <p>Wrzuć pierwsze pliki, żeby zacząć.</p>
              <button
                className="button button-primary"
                onClick={() => setView("upload")}
              >
                Upload files
              </button>
            </div>
          ) : view === "list" ? (
            <div className="admin-list">
              {items.map((item, index) => (
                <article
                  className="list-row"
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(event) => onDragOver(event, index)}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <div className="item-main">
                    <strong className="item-number">{index + 1}</strong>

                    <img src={item.thumbnail} alt="" />

                    <div className="item-copy">
                      <h2>{item.title || "Bez tytułu"}</h2>
                      <p>{item.client || "Bez klienta"}</p>
                      <small>{item.full.split("/").pop()}</small>
                    </div>
                  </div>

                  <div className="item-actions">
                    <button onClick={() => startEdit(item.id)}>
                      <Icon name="edit" />
                      edit
                    </button>

                    <button onClick={() => deleteItem(item)}>
                      <Icon name="trash" />
                      delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-grid">
              {items.map((item, index) => (
                <article
                  className="grid-card"
                  key={item.id}
                  draggable
                  onDragStart={() => onDragStart(index)}
                  onDragOver={(event) => onDragOver(event, index)}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <div className="grid-image">
                    <img src={item.thumbnail} alt="" />
                    <span className="grid-number">{index + 1}</span>
                  </div>

                  <h2>{item.title || "Bez tytułu"}</h2>
                  <p>{item.client || "Bez klienta"}</p>

                  <div className="grid-actions">
                    <button onClick={() => startEdit(item.id)}>
                      <Icon name="edit" />
                      edit
                    </button>

                    <button onClick={() => deleteItem(item)}>
                      <Icon name="trash" />
                      delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {view === "edit" && editing && (
        <section className="edit-screen">
          <button className="back-link" onClick={() => setView(previousView)}>
            <Icon name="back" />
            back to gallery
          </button>

          <div className="edit-layout">
            <div className="edit-preview">
              <img src={editing.thumbnail} alt="" />
            </div>

            <div className="edit-form">
              <h1>Edit description</h1>

              <label className="field">
                <span>Title</span>
                <input
                  value={editing.title}
                  onChange={(e) =>
                    updateEditing({
                      title: e.target.value,
                    })
                  }
                />
              </label>

              <label className="field">
                <span>Client</span>
                <input
                  value={editing.client}
                  onChange={(e) =>
                    updateEditing({
                      client: e.target.value,
                    })
                  }
                />
              </label>

              <div className="field">
                <span>Categories</span>

                <div className="chips">
                  {FILTERS.map((category) => (
                    <button
                      key={category}
                      className={
                        "chip" +
                        (editing.categories.includes(category)
                          ? " active"
                          : "")
                      }
                      onClick={() =>
                        updateEditing({
                          categories: toggleCategory(
                            category,
                            editing.categories
                          ),
                        })
                      }
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <label className="switch-row">
                <input
                  type="checkbox"
                  checked={editing.published}
                  onChange={(e) =>
                    updateEditing({
                      published: e.target.checked,
                    })
                  }
                />
                <span>Published</span>
              </label>
            </div>
          </div>
        </section>
      )}

      {view === "upload" && (
        <section className="upload-screen">
          <div
            className="dropzone"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              acceptFiles(event.dataTransfer.files)
            }}
          >
            <h1>{uploads.length ? "Drag more files here" : "Drag files here"}</h1>

            <button
              className="button button-secondary full"
              onClick={() => inputRef.current?.click()}
              disabled={saving}
            >
              {saving ? "Uploading…" : "or point files on drive"}
            </button>

            <input
              ref={inputRef}
              hidden
              multiple
              type="file"
              accept="image/*"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                if (event.target.files) {
                  acceptFiles(event.target.files)
                }

                event.target.value = ""
              }}
            />
          </div>

          {uploads.length > 0 && (
            <>
              <div className="upload-controls">
                <label className="field">
                  <span>Client — apply to all</span>
                  <input
                    value={uploadClient}
                    onChange={(e) => setUploadClient(e.target.value)}
                    placeholder="np. epaka.pl"
                  />
                </label>

                <div className="field">
                  <span>Categories — apply to all</span>

                  <div className="chips">
                    {FILTERS.map((category) => (
                      <button
                        key={category}
                        className={
                          "chip" +
                          (uploadCategories.includes(category)
                            ? " active"
                            : "")
                        }
                        onClick={() =>
                          setUploadCategories((current) =>
                            toggleCategory(category, current)
                          )
                        }
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="upload-list">
                {uploads.map((file) => (
                  <div className="upload-row" key={file.id}>
                    <input
                      value={file.title}
                      onChange={(e) =>
                        setUploads((current) =>
                          current.map((entry) =>
                            entry.id === file.id
                              ? {
                                  ...entry,
                                  title: e.target.value,
                                }
                              : entry
                          )
                        )
                      }
                    />

                    <span>{file.originalName}</span>

                    <button
                      onClick={() =>
                        setUploads((current) =>
                          current.filter((entry) => entry.id !== file.id)
                        )
                      }
                    >
                      <Icon name="trash" />
                      delete
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="button button-primary upload-submit"
                onClick={addUploadedItems}
                disabled={saving}
              >
                <Icon name="upload" />
                {saving ? "Publishing…" : "Upload to gallery"}
              </button>
            </>
          )}
        </section>
      )}
    </main>
  )
}
