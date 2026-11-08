import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react'

type Model = { id: string; label: string; provider: string; note: string }

const models: Model[] = [
  { id: 'openai/gpt-6.1-terra', label: 'GPT-6.1 Terra', provider: 'OpenAI', note: 'Максимальная детализация' },
  { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5', provider: 'Anthropic', note: 'Точная работа с инструкциями' },
  { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'OpenAI', note: 'Сбалансированный режим' },
  { id: 'qwen/qwen3.5-397b-a17b', label: 'Qwen 3.5', provider: 'Qwen', note: 'Многоязычная обработка' },
  { id: 'sber/gigachat-3.5-ultra', label: 'GigaChat 3.5 Ultra', provider: 'Сбер', note: 'Российская модель' },
  { id: 'yandex/gpt-lite-5', label: 'YandexGPT Lite 5', provider: 'Яндекс', note: 'Быстрый черновик' },
]

const steps = [
  'Проверяем PDF и извлекаем структуру инструкции',
  'Отбираем разделы по техническому обслуживанию',
  'Проверяем регистрационный номер медицинского изделия',
  'Формируем работы, периодичность и расходные материалы',
  'Оформляем итоговый документ Word',
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
        if (next === 100) { window.clearInterval(timer); setReady(true) }
        return next
      })
    }, 420)
    return () => window.clearInterval(timer)
  }, [progress])

  const accept = (candidate?: File) => {
    if (candidate?.type === 'application/pdf' || candidate?.name.toLowerCase().endsWith('.pdf')) {
      setFile(candidate); setReady(false); setProgress(null)
    }
  }
  const onDrop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(false); accept(event.dataTransfer.files[0]) }
  const onFileInput = (event: ChangeEvent<HTMLInputElement>) => accept(event.target.files?.[0])
  const start = () => {
    if (!file) { inputRef.current?.click(); return }
    setModelOpen(false); setReady(false); setStep(0); setProgress(4)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="pdf2tz — на главную"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>pdf2tz</span></a>
        <div className="topbar-meta"><span>Рабочая область</span><span className="environment-badge">beta</span></div>
      </header>
      <main id="top" className="content">
        <section className="page-intro" aria-labelledby="page-title"><p className="section-label">Подготовка документа</p><h1 id="page-title">Техническое задание<br />на обслуживание</h1><p>Загрузите инструкцию медицинского изделия. Сервис подготовит DOCX с перечнем работ и отдельный список расходных материалов.</p></section>
        <section className="workspace-layout" aria-label="Форма подготовки технического задания">
          <div className="task-card">
            <div className="card-heading"><div><p className="section-label">Новый документ</p><h2>Исходные данные</h2></div><span className="step-badge">1 из 2</span></div>
            <div className={`dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`} onDrop={onDrop} onDragOver={(event) => event.preventDefault()} onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onClick={() => inputRef.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && inputRef.current?.click()}>
              <input ref={inputRef} type="file" accept="application/pdf" onChange={onFileInput} />
              {file ? <><span className="file-icon">PDF</span><div className="file-details"><b>{file.name}</b><span>{(file.size / 1024 / 1024).toFixed(1)} МБ · файл готов к обработке</span></div><button className="remove-file" onClick={(event) => { event.stopPropagation(); setFile(null); setReady(false); setProgress(null) }} aria-label="Удалить файл">×</button></> : <><span className="upload-icon" aria-hidden="true">↑</span><b>Перетащите инструкцию в PDF</b><span>или выберите файл на компьютере</span><small>Текстовый слой PDF · до 200 МБ</small></>}
            </div>
            <div className="form-divider" />
            <div className="model-block"><label htmlFor="model-select">Модель для подготовки ТЗ</label><button id="model-select" className="model-select" onClick={() => setModelOpen((value) => !value)} aria-expanded={modelOpen} aria-controls="model-menu"><span className="model-symbol" aria-hidden="true">✦</span><span><b>{selectedModel.label}</b><small>{selectedModel.provider} · {selectedModel.note}</small></span><i aria-hidden="true">{modelOpen ? '−' : '+'}</i></button>
              {modelOpen && <div id="model-menu" className="model-menu" role="listbox" aria-label="Выбор модели">{models.map((model) => <button key={model.id} role="option" aria-selected={model.id === selectedModel.id} className={model.id === selectedModel.id ? 'active' : ''} onClick={() => { setSelectedModel(model); setModelOpen(false) }}><span><b>{model.label}</b><small>{model.provider}</small></span><em>{model.note}</em></button>)}</div>}
            </div>
            <div className="action-area"><button className="generate" onClick={start} disabled={progress !== null && progress < 100}>{progress !== null && progress < 100 ? 'Подготавливаем документ…' : ready ? 'Подготовить повторно' : 'Подготовить ТЗ'}<span aria-hidden="true">→</span></button><p>После проверки сформируется DOCX и перечень расходников.</p></div>
          </div>
          <aside className="guidance-card" aria-label="Требования и ограничения"><div><p className="section-label">Перед началом</p><h2>Что нужно знать</h2></div><div className="guide-group"><h3>Требования к инструкции</h3><ul className="check-list"><li>Один файл в формате PDF.</li><li>PDF должен содержать текстовый слой.</li><li>Инструкция может быть на любом языке.</li></ul></div><div className="guide-group risk-group"><h3>Контроль результата</h3><p>ТЗ создаётся только по сведениям из инструкции. Перед использованием проверьте итоговый перечень работ и периодичность.</p><p>Если действующий регистрационный номер не найден в реестре, поле останется пустым.</p></div><div className="security-note"><span aria-hidden="true">⌁</span>Файл используется только для подготовки вашего документа.</div></aside>
        </section>
        <section className="workflow-section" aria-labelledby="workflow-title"><div className="workflow-heading"><p className="section-label">Логика обработки</p><h2 id="workflow-title">Как формируется результат</h2></div><ol className="workflow-list"><li><span>01</span><div><h3>Извлечение</h3><p>Читаем текст, структуру и содержательные таблицы инструкции.</p></div></li><li><span>02</span><div><h3>Анализ</h3><p>Находим регламентные работы, периодичность и расходники.</p></div></li><li><span>03</span><div><h3>Проверка</h3><p>Ищем действующее регистрационное удостоверение в реестре.</p></div></li><li><span>04</span><div><h3>Документ</h3><p>Собираем ТЗ по утверждённому шаблону Word.</p></div></li></ol></section>
      </main>
      <footer><span>pdf2tz</span><span>Подготовка ТЗ для технического обслуживания медицинских изделий</span></footer>
      {progress !== null && <div className="generation-panel" aria-live="polite">{ready ? <div className="success-state"><span className="check">✓</span><div><b>Документ подготовлен</b><p>ТЗ и перечень расходников готовы к скачиванию.</p></div><button onClick={() => { setProgress(null); setReady(false) }}>Закрыть</button></div> : <><div className="generation-title"><span className="pulse" /><span>Формируем ТЗ</span><strong>{progress}%</strong></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p>{steps[step]}</p></>}</div>}
    </div>
  )
}

export default App
