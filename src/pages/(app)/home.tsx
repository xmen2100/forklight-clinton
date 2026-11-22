export default function HomePage() {
  return (
    <section
      className="min-h-full px-6 py-16"
      style={{ background: '#faf9f6', color: '#26382f' }}
    >
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl font-semibold">
          Your next decision starts here.
        </h1>

        <p className="mt-6 text-lg leading-relaxed">
          Compare your options, weigh what matters, and test which
          priorities change the result. Record your reasoning so you
          can learn from the outcome.
        </p>

        <a
          href="/decisions"
          className="mt-8 inline-block rounded-lg px-6 py-3 font-semibold"
          style={{ background: '#315942', color: '#fff' }}
        >
          Open your notebook →
        </a>

        <p className="mt-4 text-sm">
          Sign in to save and revisit your decisions.
        </p>
      </div>
    </section>
  )
}