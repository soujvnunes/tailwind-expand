export default function Home() {
  return (
    <div className="Home">
      <div className="HomeHero">
        <h1 className="HomeHeroTitle">tailwind-expand Demo</h1>
        <p className="HomeHeroDescription">
          Define reusable component styles with familiar @apply syntax, then use
          them in JSX with full variant support.
        </p>

        {/* Button Examples */}
        <section className="HomeSection">
          <h2 className="HomeSectionTitle">Buttons</h2>
          <div className="HomeSectionContent">
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
          <div className="HomeSectionContent">
            <button className="Button ButtonMd ButtonSecondary">
              Secondary
            </button>
            <button className="Button ButtonMd ButtonDanger">Danger</button>
          </div>
        </section>

        {/* Deep Composition - Aliases + Utilities */}
        <section className="HomeSection">
          <h2 className="HomeSectionTitle">Deep Composition</h2>
          <p className="HomeHeroDescription">
            HomeSectionActionsSubmit = Button + ButtonMd + ButtonPrimary + flex-1
            + shadow-md
          </p>
          <div className="HomeSectionActions">
            <button className="HomeSectionActionsSubmit">Submit</button>
            <button className="HomeSectionActionsCancel">Cancel</button>
          </div>
        </section>

        {/* Responsive Example */}
        <section className="HomeSection">
          <h2 className="HomeSectionTitle">Responsive Variants</h2>
          <div className="HomeSectionContent">
            <button className="Button ButtonSm lg:ButtonMd xl:ButtonLg ButtonPrimary">
              Responsive Button (resize window)
            </button>
          </div>
        </section>

        {/* Card Example */}
        <section className="HomeSection">
          <h2 className="HomeSectionTitle">Card Component</h2>
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
        <section className="HomeSection">
          <h2 className="HomeSectionTitle">Important Modifier</h2>
          <div className="HomeSectionContent">
            <button className="Button ButtonMd ButtonPrimary !ButtonSecondary">
              Overridden with !important
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
