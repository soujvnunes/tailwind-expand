import './globals.css'

function App() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="TypographyHeading text-gray-900">
          tailwind-expand Demo
        </h1>

        {/* Button Examples */}
        <section className="space-y-4">
          <h2 className="TypographyCaption text-gray-500">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <button className="Button ButtonSm ButtonPrimary">
              Small Primary
            </button>
            <button className="Button ButtonMd ButtonPrimary">
              Medium Primary
            </button>
            <button className="Button ButtonLg ButtonPrimary">
              Large Primary
            </button>
          </div>
          <div className="flex flex-wrap gap-4">
            <button className="Button ButtonMd ButtonSecondary">
              Secondary
            </button>
            <button className="Button ButtonMd ButtonDanger">
              Danger
            </button>
          </div>
        </section>

        {/* Responsive Example */}
        <section className="space-y-4">
          <h2 className="TypographyCaption text-gray-500">Responsive Variants</h2>
          <button className="Button ButtonSm lg:ButtonMd xl:ButtonLg ButtonPrimary">
            Responsive Button (resize window)
          </button>
        </section>

        {/* Card Example */}
        <section className="space-y-4">
          <h2 className="TypographyCaption text-gray-500">Card Component</h2>
          <div className="Card">
            <div className="CardHeader">
              <h3 className="CardTitle">Card Title</h3>
            </div>
            <p className="CardBody">
              This card uses component aliases that expand to Tailwind utilities
              at build time. Inspect the DOM to see the actual classes!
            </p>
          </div>
        </section>

        {/* Important Modifier */}
        <section className="space-y-4">
          <h2 className="TypographyCaption text-gray-500">Important Modifier</h2>
          <button className="Button ButtonMd ButtonPrimary !bg-purple-600 hover:!bg-purple-700">
            Overridden with !important
          </button>
        </section>
      </div>
    </div>
  )
}

export default App
