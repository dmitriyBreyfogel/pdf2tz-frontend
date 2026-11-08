import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'

type Model = { id: string; label: string; provider: string; note: string }

const models: Model[] = [
  { id: 'openai/gpt-6.1-terra', label: 'GPT-6.1 Terra', provider: 'OpenAI', note: 'Наиболее подробный результат' },
  { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'Anthropic', note: 'Точная работа с инструкциями' },
  { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'OpenAI', note: 'Сбалансированная скорость' },
  { id: 'qwen/qwen3.5-397b-a17b', label: 'Qwen 3.5', provider: 'Qwen', note: 'Китайская модель' },
  { id: 'sber/gigachat-3.5-ultra', label: 'GigaChat 3.5 Ultra', provider: 'Сбер', note: 'Российская модель' },
  { id: 'yandex/gpt-lite-5', label: 'YandexGPT Lite 5', provider: 'Яндекс', note: 'Быстрый черновик' },
]

const steps = [
  'Проверяем PDF и читаем текст инструкции',
  'Находим работы по техническому обслуживанию',
  'Сверяем регистрационный номер изделия',
  'Формируем перечень работ и расходников',
  'Собираем документ Word',
]

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [selectedModel, setSelectedModel] = useState(models[0])
  const [modelOpen, setModelOpen] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const [ready, setReady] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (progress === null || progress === 100) return
    const timer = window.setInterval(() => {
      setProgress((current) => {
        if (current === null) return current
        const next = Math.min(100, current + (current < 76 ? 4 : 2))
        setStep(Math.min(steps.length - 1, Math.floor(next / 20)))
        if (next === 100) {
          window.clearInterval(timer)
          setReady(true)
        }
        return next
      })
    }, 420)
    return () => window.clearInterval(timer)
  }, [progress])

  const accept = (candidate?: File) => {
    if (candidate?.type === 'application/pdf' || candidate?.name.toLowerCase().endsWith('.pdf')) {
      setFile(candidate)
      setReady(false)
      setProgress(null)
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragging(false)
    accept(event.dataTransfer.files[0])
  }

  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => accept(event.target.files?.[0])

  const start = () => {
    if (!file) {
      inputRef.current?.click()
      return
    }
    setReady(false)
    setStep(0)
    setProgress(4)
  }

  return (
    <main>
      <div className="atmosphere atmosphere-one" />
      <div className="atmosphere atmosphere-two" />
      <nav className="topbar">
        <a className="brand" href="#top" aria-label="pdf2tz">
          <span className="brand-mark"><i /><i /><i /></span>
          <span>pdf2tz</span>
        </a>
        <div className="nav-meta"><span className="status-dot" />Сервис доступен</div>
      </nav>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span>01</span> Подготовка технического задания</p>
          <h1>Инструкция на входе.<br /><em>Готовое ТЗ</em> на выходе.</h1>
          <p className="lead">Загрузите руководство медицинского изделия. Сервис выделит регламентные работы, периодичность и расходные материалы, а затем подготовит документ Word.</p>
          <div className="proof-row">
            <div><b>PDF</b><span>Инструкция производителя</span></div>
            <span className="proof-arrow">→</span>
            <div><b>DOCX</b><span>Техническое задание</span></div>
          </div>
        </div>

        <div className="workspace" aria-label="Подготовка ТЗ">
          <div className="workspace-head"><span>Новый документ</span><span>Шаг 1 из 2</span></div>
          <div
            className={`dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`}
            onDrop={onDrop}
            onDragOver={(event) => event.preventDefault()}
            onDragEnter={() => setDragging(true)}
            onDragLeave={() => setDragging(false)}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}
          >
            <input ref={inputRef} type="file" accept="application/pdf" onChange={onFileInput} />
            {file ? <>
              <span className="file-icon">PDF</span>
              <div className="file-details"><b>{file.name}</b><span>{(file.size / 1024 / 1024).toFixed(1)} МБ · готов к обработке</span></div>
              <button className="remove-file" onClick={(event) => { event.stopPropagation(); setFile(null); setReady(false); setProgress(null) }} aria-label="Удалить файл">×</button>
            </> : <>
              <span className="upload-orbit"><span>↑</span></span>
              <b>Перетащите инструкцию сюда</b>
              <span>или выберите PDF на компьютере</span>
              <small>до 200 МБ · текстовый слой PDF</small>
            </>}
          </div>

          <div className="model-block">
            <label>Модель для подготовки ТЗ</label>
            <button className="model-select" onClick={() => setModelOpen((value) => !value)} aria-expanded={modelOpen}>
              <span className="model-orb">✦</span>
              <span><b>{selectedModel.label}</b><small>{selectedModel.provider} · {selectedModel.note}</small></span>
              <i>{modelOpen ? '−' : '+'}</i>
            </button>
            {modelOpen && <div className="model-menu">
              {models.map((model) => <button key={model.id} className={model.id === selectedModel.id ? 'active' : ''} onClick={() => { setSelectedModel(model); setModelOpen(false) }}>
                <span><b>{model.label}</b><small>{model.provider}</small></span><em>{model.note}</em>
              </button>)}
            </div>}
          </div>

          <button className="generate" onClick={start} disabled={progress !== null && progress < 100}>
            {progress !== null && progress < 100 ? 'Готовим документ…' : ready ? 'Подготовить ещё раз' : 'Сформировать ТЗ'}
            <span>→</span>
          </button>
          <p className="privacy-note">Инструкция используется только для подготовки документа.</p>
        </div>
      </section>

      <section className="how-it-works" id="process">
        <div className="section-heading"><p className="eyebrow"><span>02</span> Как это работает</p><h2>Без ручного поиска<br />по сотням страниц.</h2></div>
        <div className="process-list">
          <article><span>01</span><h3>Читаем инструкцию</h3><p>Извлекаем текст и структуру из PDF, не теряя данные из полезных таблиц.</p></article>
          <article><span>02</span><h3>Собираем регламент</h3><p>Находим обслуживание, очистку, проверки, периодичность и нужные расходники.</p></article>
          <article><span>03</span><h3>Выдаём готовое ТЗ</h3><p>Возвращаем оформленный DOCX и отдельный перечень расходных материалов.</p></article>
        </div>
      </section>

      {progress !== null && <div className="generation-panel" aria-live="polite">
        {ready ? <div className="success-state"><span className="check">✓</span><div><b>Документ подготовлен</b><p>ТЗ и перечень расходников готовы к скачиванию.</p></div><button onClick={() => { setProgress(null); setReady(false) }}>Закрыть</button></div> : <>
          <div className="generation-title"><span className="pulse" /><span>Формируем ТЗ</span><strong>{progress}%</strong></div>
          <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
          <p>{steps[step]}</p>
        </>}
      </div>}
    </main>
  )
}

export default App
