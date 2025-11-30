function App() {
  return (
    <div className="App">
      <div className="AppHero">
        <h1 className="AppHeroTitle">tailwind-expand Demo</h1>
        <p className="AppHeroDescription">
          Define reusable component styles with familiar @apply syntax, then use
          them in JSX with full variant support.
        </p>

        {/* Button Examples */}
        <section className="AppSection">
          <h2 className="AppSectionTitle">Buttons</h2>
          <div className="AppSectionContent">
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
          <div className="AppSectionContent">
            <button className="Button ButtonMd ButtonSecondary">
              Secondary
            </button>
            <button className="Button ButtonMd ButtonDanger">Danger</button>
          </div>
        </section>

        {/* Deep Composition - Aliases + Utilities */}
        <section className="AppSection">
          <h2 className="AppSectionTitle">Deep Composition</h2>
          <p className="AppHeroDescription">
            AppSectionActionsSubmit = Button + ButtonMd + ButtonPrimary + flex-1
            + shadow-md
          </p>
          <div className="AppSectionActions">
            <button className="AppSectionActionsSubmit">Submit</button>
            <button className="AppSectionActionsCancel">Cancel</button>
          </div>
        </section>

        {/* Responsive Example */}
        <section className="AppSection">
          <h2 className="AppSectionTitle">Responsive Variants</h2>
          <div className="AppSectionContent">
            <button className="Button ButtonSm lg:ButtonMd xl:ButtonLg ButtonPrimary">
              Responsive Button (resize window)
            </button>
          </div>
        </section>

        {/* Card Example */}
        <section className="AppSection">
          <h2 className="AppSectionTitle">Card Component</h2>
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
        <section className="AppSection">
          <h2 className="AppSectionTitle">Important Modifier</h2>
          <div className="AppSectionContent">
            <button className="Button ButtonMd ButtonPrimary !ButtonSecondary">
              Overridden with !important
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

export default App
