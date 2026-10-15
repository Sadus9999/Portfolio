"use client"

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { ListBulletIcon } from "@heroicons/react/20/solid"
import { Squares2X2Icon } from "@heroicons/react/24/solid"
import {
  ArrowLeftIcon,
  ArrowUpTrayIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline"

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
  const [dropActive, setDropActive] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropDepthRef = useRef(0)

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const currentState = window.history.state || {}
    window.history.replaceState(
      { ...currentState, cmsView: "list" },
      "",
      window.location.href
    )

    const onPopState = (event: PopStateEvent) => {
      const nextView = event.state?.cmsView as View | undefined

      if (nextView === "edit" && event.state?.editingId) {
        setEditingId(event.state.editingId)
        setView("edit")
        return
      }

      if (nextView === "upload") {
        setView("upload")
        return
      }

      if (nextView === "list" || nextView === "grid") {
        setPreviousView(nextView)
        setView(nextView)
      }
    }

    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
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

  function replaceHistoryState(next: "list" | "grid") {
    const currentState = window.history.state || {}
    window.history.replaceState(
      { ...currentState, cmsView: next, editingId: undefined },
      "",
      window.location.href
    )
  }

  function pushHistoryState(next: "edit" | "upload", editingId?: string) {
    const currentState = window.history.state || {}
    window.history.pushState(
      { ...currentState, cmsView: next, editingId },
      "",
      window.location.href
    )
  }

  function switchBaseView(next: "list" | "grid") {
    setPreviousView(next)
    setView(next)
    replaceHistoryState(next)
  }

  function openUpload() {
    setView("upload")
    pushHistoryState("upload")
  }

  function startEdit(id: string) {
    setEditingId(id)
    setView("edit")
    pushHistoryState("edit", id)
  }

  function goBack() {
    const currentView = window.history.state?.cmsView

    if (currentView === "edit" || currentView === "upload") {
      window.history.back()
      return
    }

    setView(previousView)
    replaceHistoryState(previousView)
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

  function onDropzoneDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dropDepthRef.current += 1
    setDropActive(true)
  }

  function onDropzoneDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"

    if (!dropActive) {
      setDropActive(true)
    }
  }

  function onDropzoneDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dropDepthRef.current = Math.max(0, dropDepthRef.current - 1)

    if (dropDepthRef.current === 0) {
      setDropActive(false)
    }
  }

  async function onDropzoneDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dropDepthRef.current = 0
    setDropActive(false)
    await acceptFiles(event.dataTransfer.files)
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
      goBack()
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
        <button
          className="brand-button"
          onClick={() => {
            if (view === "edit" || view === "upload") goBack()
          }}
          aria-label="Back to gallery"
        >
          <img
            className="brand-logo brand-logo-header"
            src="/demigod-logo.svg"
            alt="Demigod"
          />
        </button>

        <div className="header-actions">
          {view !== "upload" && (
            <button className="button button-secondary" onClick={openUpload}>
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
                if (await publish()) goBack()
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
              <ListBulletIcon
                className={
                  "view-icon view-icon-list" +
                  (view === "list" ? " active" : "")
                }
                aria-hidden="true"
              />
              <Squares2X2Icon
                className={
                  "view-icon view-icon-grid" +
                  (view === "grid" ? " active" : "")
                }
                aria-hidden="true"
              />
              <span>zmień widok</span>
            </button>
          </div>

          {items.length === 0 ? (
            <div className="empty-admin">
              <h2>Galeria jest pusta</h2>
              <p>Wrzuć pierwsze pliki, żeby zacząć.</p>
              <button className="button button-primary" onClick={openUpload}>
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
                      <PencilSquareIcon className="action-icon" aria-hidden="true" />
                      edit
                    </button>

                    <button onClick={() => deleteItem(item)}>
                      <TrashIcon className="action-icon" aria-hidden="true" />
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
                      <PencilSquareIcon className="action-icon" aria-hidden="true" />
                      edit
                    </button>

                    <button onClick={() => deleteItem(item)}>
                      <TrashIcon className="action-icon" aria-hidden="true" />
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
          <button className="back-link" onClick={goBack}>
            <ArrowLeftIcon className="back-icon" aria-hidden="true" />
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
                        (editing.categories.includes(category) ? " active" : "")
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
          <button className="back-link" onClick={goBack}>
            <ArrowLeftIcon className="back-icon" aria-hidden="true" />
            back to gallery
          </button>

          <div
            className={
              "dropzone " +
              (uploads.length ? "has-files" : "initial") +
              (dropActive ? " is-dragging" : "")
            }
            onDragEnter={onDropzoneDragEnter}
            onDragOver={onDropzoneDragOver}
            onDragLeave={onDropzoneDragLeave}
            onDrop={onDropzoneDrop}
          >
            <div className="dropzone-copy">
              <h1>
                {dropActive
                  ? "Release files to upload"
                  : uploads.length
                    ? "Drag more files here"
                    : "Drag files here"}
              </h1>
              <p className="dropzone-hint">
                {dropActive
                  ? "Drop them anywhere inside this area"
                  : "JPG, PNG or WebP — you can drop multiple files at once"}
              </p>
            </div>

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
                          (uploadCategories.includes(category) ? " active" : "")
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
                      <TrashIcon className="action-icon" aria-hidden="true" />
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
                <ArrowUpTrayIcon className="upload-icon" aria-hidden="true" />
                {saving ? "Publishing…" : "Upload to gallery"}
              </button>
            </>
          )}
        </section>
      )}
    </main>
  )
}
