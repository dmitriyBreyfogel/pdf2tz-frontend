import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'
import { Consumable, GeneratedDocument, MaintenanceModel, generateDocument, getModels } from './api'

type Model = { id: string; label: string; provider: string; note: string }

const fallbackModels: Model[] = [
  { id: 'openai/gpt-6.1-terra', label: 'GPT-6.1 Terra', provider: 'OpenAI', note: 'Максимальная детализация' },
  { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'Anthropic', note: 'Точная работа с инструкциями' },
  { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'OpenAI', note: 'Сбалансированный режим' },
  { id: 'qwen/qwen3.5-397b-a17b', label: 'Qwen 3.5 397B A17B', provider: 'Qwen', note: 'Многоязычная обработка' },
  { id: 'sber/gigachat-3.5-ultra', label: 'GigaChat 3.5 Ultra', provider: 'Сбер', note: 'Российская модель' },
  { id: 'yandex/gpt-lite-5', label: 'YandexGPT Lite 5', provider: 'Яндекс', note: 'Быстрый черновик' },
]

const steps = ['Читаем и структурируем инструкцию', 'Отбираем требования к обслуживанию', 'Проверяем регистрационный номер', 'Собираем работы и расходники', 'Оформляем документ Word']

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [models, setModels] = useState(fallbackModels)
  const [selectedModel, setSelectedModel] = useState(fallbackModels[0])
  const [modelOpen, setModelOpen] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<GeneratedDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showUp, setShowUp] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getModels().then((items) => items.map(toModel)).then((items) => {
      if (items.length > 0) { setModels(items); setSelectedModel(items[0]) }
    }).catch(() => undefined)
  }, [])
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.documentUrl) }, [result])
  useEffect(() => {
    const update = () => setShowUp(window.scrollY > window.innerHeight * .55)
    window.addEventListener('scroll', update, { passive: true }); update()
    return () => window.removeEventListener('scroll', update)
  }, [])

  const accept = (candidate?: File) => {
    if (candidate?.type === 'application/pdf' || candidate?.name.toLowerCase().endsWith('.pdf')) { setFile(candidate); setError(null) }
    else if (candidate) setError('Выберите инструкцию в формате PDF.')
  }
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files[0]) }
  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => accept(event.target.files?.[0])
  const clearResult = () => setResult((current) => { if (current) URL.revokeObjectURL(current.documentUrl); return null })

  const start = async () => {
    if (!file) { inputRef.current?.click(); return }
    setModelOpen(false); setError(null); setCopied(false); clearResult(); setStep(0); setProgress(4)
    const timer = window.setInterval(() => setProgress((current) => {
      if (current === null || current >= 90) return current
      const next = Math.min(90, current + (current < 70 ? 4 : 2))
      setStep(Math.min(steps.length - 1, Math.floor(next / 20)))
      return next
    }), 600)
    try {
      const response = await generateDocument(file, selectedModel.id)
      window.clearInterval(timer); setStep(steps.length - 1); setProgress(100); setResult(response)
    } catch (requestError) {
      window.clearInterval(timer); setProgress(null)
      setError(requestError instanceof Error ? requestError.message : 'Не удалось подготовить документ. Повторите запрос позже.')
    }
  }

  const copyConsumables = async () => {
    if (!result) return
    const text = result.consumables.map((item, index) => `${index + 1}. ${item.name}${item.purpose ? ` — ${item.purpose}` : ''}${item.consumptionRate ? ` (${item.consumptionRate})` : ''}`).join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true); window.setTimeout(() => setCopied(false), 1800)
  }

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#start" aria-label="pdf2tz — к началу"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>pdf2tz</span></a>
      <nav aria-label="Разделы"><a href="#limits">Ограничения</a><a href="#process">Как работает</a><a href="#data">Данные</a></nav>
      <span className="environment-badge">beta</span>
    </header>

    <main>
      <section id="start" className="hero-screen" aria-labelledby="page-title">
        <div className="hero-heading"><p className="section-label">Подготовка документа</p><h1 id="page-title">Техническое задание<br />на обслуживание</h1><p>Загрузите инструкцию медицинского изделия — сервис подготовит DOCX и соберёт список расходных материалов.</p></div>
        <div className={`workspace ${result ? 'has-result' : ''}`}>
          <section className="input-panel" aria-label="Исходные данные">
            <div className="panel-head"><div><p className="section-label">Новый документ</p><h2>Инструкция и модель</h2></div><span className="step-badge">PDF → DOCX</span></div>
            <div className={`dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`} onDrop={onDrop} onDragOver={(event) => event.preventDefault()} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}>
              <input ref={inputRef} type="file" accept="application/pdf" onChange={onFileInput} />
              {file ? <><span className="file-icon">PDF</span><div className="file-details"><b>{file.name}</b><span>{(file.size / 1024 / 1024).toFixed(1)} МБ · готов к обработке</span></div><button className="remove-file" onClick={(event) => { event.stopPropagation(); setFile(null); setError(null); clearResult() }} aria-label="Удалить файл">×</button></> : <><span className="upload-icon" aria-hidden="true">↑</span><b>Перетащите инструкцию сюда</b><span>или выберите PDF на компьютере</span><small>Текстовый слой PDF · до 200 МБ</small></>}
            </div>
            <div className="model-block"><label htmlFor="model-select">Модель для подготовки ТЗ</label><button id="model-select" className="model-select" onClick={() => setModelOpen((value) => !value)} aria-expanded={modelOpen} aria-controls="model-menu"><ModelLogo provider={selectedModel.provider} /><span><b>{selectedModel.label}</b><small>{selectedModel.provider} · {selectedModel.note}</small></span><i aria-hidden="true">{modelOpen ? '−' : '+'}</i></button>{modelOpen && <div id="model-menu" className="model-menu" role="listbox" aria-label="Выбор модели">{models.map((model) => <button key={model.id} role="option" aria-selected={model.id === selectedModel.id} className={model.id === selectedModel.id ? 'active' : ''} onClick={() => { setSelectedModel(model); setModelOpen(false) }}><ModelLogo provider={model.provider} /><span><b>{model.label}</b><small>{model.provider}</small></span><em>{model.note}</em></button>)}</div>}</div>
            {error && <p className="request-error" role="alert">{error}</p>}
            {result ? <a className="download-button" href={result.documentUrl} download={result.documentFileName}><span>↓</span>Скачать ТЗ <small>DOCX</small></a> : <button className="generate" onClick={start} disabled={progress !== null}>{progress !== null ? 'Подготавливаем документ…' : 'Подготовить ТЗ'}<span aria-hidden="true">→</span></button>}
          </section>
          <ResultPanel document={result} copied={copied} onCopy={copyConsumables} />
        </div>
        {progress !== null && !result && <div className="generation-panel" aria-live="polite"><div><span className="pulse" />Формируем ТЗ <strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p>{steps[step]}</p></div>}
      </section>

      <section id="limits" className="info-screen limits-screen"><div className="screen-number">01</div><div className="screen-copy"><p className="section-label">Ограничения</p><h2>Результат опирается<br />на инструкцию.</h2><p>Сервис не дополняет регламент предположениями: если сведения отсутствуют в руководстве, они не появляются в ТЗ.</p></div><div className="screen-card"><h3>Перед загрузкой</h3><ul><li>Один PDF-файл с текстовым слоем.</li><li>Инструкция может быть на любом языке.</li><li>Проверьте готовое ТЗ перед применением.</li></ul></div></section>
      <section id="process" className="info-screen process-screen"><div className="screen-number">02</div><div className="screen-copy"><p className="section-label">Как работает</p><h2>Пять этапов<br />одного запроса.</h2></div><ol className="process-list"><li><span>01</span>Читаем структуру и полезные таблицы PDF.</li><li><span>02</span>Выбираем фрагменты о техническом обслуживании.</li><li><span>03</span>Находим работы, периодичность и расходники.</li><li><span>04</span>Проверяем РУ в реестре Росздравнадзора.</li><li><span>05</span>Собираем DOCX по утверждённому шаблону.</li></ol></section>
      <section id="data" className="info-screen data-screen"><div className="screen-number">03</div><div className="screen-copy"><p className="section-label">Данные и проверка</p><h2>Прозрачный<br />рабочий процесс.</h2><p>PDF нужен только для подготовки вашего документа. Список расходников показывается отдельно, чтобы его можно было передать в закупку или сохранить.</p></div><div className="screen-card"><h3>Регистрационный номер</h3><p>Если найдено единственное действующее РУ — оно попадёт в ТЗ. Уникальное просроченное РУ тоже указывается с отметкой о дате окончания срока действия.</p></div></section>
    </main>
    {showUp && <button className="scroll-up" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Вернуться к подготовке ТЗ">↑</button>}
  </div>
}

function ResultPanel({ document, copied, onCopy }: { document: GeneratedDocument | null; copied: boolean; onCopy: () => void }) {
  if (!document) return <aside className="result-panel empty"><span className="result-mark">✓</span><h2>Здесь появится результат</h2><p>После генерации в этом месте можно будет скачать готовое ТЗ и скопировать список расходных материалов.</p></aside>
  const consumables = document.consumables as Consumable[]
  return <aside className="result-panel" aria-label="Результат генерации"><div className="result-title"><div><p className="section-label">Готово</p><h2>Расходные материалы</h2></div><span>{consumables.length}</span></div><button className="copy-button" onClick={onCopy}>{copied ? 'Скопировано' : 'Копировать список'}<i>⧉</i></button>{consumables.length === 0 ? <p className="empty-list">В инструкции не указаны расходные материалы.</p> : <ol className="consumables-list">{consumables.map((item, index) => <li key={`${item.name}-${index}`}><b>{item.name}</b>{item.purpose && <span>{item.purpose}</span>}{item.consumptionRate && <small>{item.consumptionRate}</small>}</li>)}</ol>}</aside>
}

function ModelLogo({ provider }: { provider: string }) { const symbol: Record<string, string> = { OpenAI: '◉', Anthropic: 'AI', Qwen: 'Q', Сбер: 'S', Яндекс: 'Я' }; return <span className={`model-logo ${provider === 'Сбер' ? 'sber' : provider === 'Яндекс' ? 'yandex' : provider.toLowerCase()}`}>{symbol[provider] ?? '✦'}</span> }
function toModel(model: MaintenanceModel): Model { return { id: model.modelCode, label: model.displayName, provider: model.provider, note: model.schemaEnforced ? 'Структурированный ответ' : 'Быстрый черновик' } }

export default App
