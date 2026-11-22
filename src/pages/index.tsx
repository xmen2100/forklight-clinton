export default function Index() {
  return (
    <>
      <title>Forklight · A little clarity</title>
      <meta name="description" content="Compare your options, test what matters, and keep the reasoning behind your decisions with Forklight." />
      <link rel="canonical" href="https://forklight-clinton.app.space/" />
      <main data-testid="static-landing" style={{ minHeight: '100vh', background: '#faf9f6', color: '#26382f', padding: '80px 24px', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <p style={{ fontWeight: 700, fontSize: 24 }}>forklight.</p>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', lineHeight: 1.1, letterSpacing: '-0.04em' }}>Make a choice you can explain.</h1>
          <p style={{ fontSize: 20, lineHeight: 1.7 }}>Compare your options, weigh what matters, and see which assumptions change the result. Keep your reasoning, then come back to reflect.</p>
          <a href="/decisions" style={{ display: 'inline-block', marginTop: 24, padding: '14px 24px', borderRadius: 8, background: '#315942', color: '#fff', textDecoration: 'none', fontWeight: 600 }}>Open your notebook →</a>
          <p style={{ marginTop: 24, fontSize: 14 }}>Sign in to save your decisions to your private notebook.</p>
          <ol style={{ marginTop: 48, paddingLeft: 24, lineHeight: 2 }}>
            <li>Compare options against your own criteria.</li>
            <li>Test how changing a priority affects the leader.</li>
            <li>Record your choice and revisit the outcome.</li>
          </ol>
        </div>
      </main>
    </>
  )
}
