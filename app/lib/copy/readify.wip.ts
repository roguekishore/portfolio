// Readify: case-study copy. Every claim traces to a file in local/repos/eBook-Store; the sources are
// listed in local/boards/readify.md.
import type { ProjectCopy } from "./types";

export default {
  title: "Client-Side e-Book Storefront",
  sector: "E-commerce",
  year: "2024",
  description:
    "A React storefront for a 20-title e-book catalog, where one substring search over title, author and category drives the grid and a context-held cart feeds a mock checkout.",
  stack: ["React", "React Router", "JavaScript", "CSS"],
  intro: {
    heading: "A complete bookstore flow with nothing behind it but the browser",
    body: [
      "A storefront with no backend still has to feel like a store. This front end for an e-book shop was built as a college project with the server deliberately left out, yet the whole purchase path has to work: sign in, browse a carousel of covers, search a catalog, fill a cart, and check out. Every one of those steps runs on React state alone, with no database and no payment provider behind it.",
      "The catalog is a hard-coded array of 20 books across three categories. A single lowercase substring test over title, author and category filters it on every keystroke, and a cart held in React context accepts duplicates, removes by id and reports its count in the navigation bar. Checkout resolves its order list from navigation state or the cart, then clears the cart.",
      "The result is a deployed storefront that is honest about its boundary. The README states the scope, the login accepts any credentials, and a short-lived json-server experiment was added and removed within a day, leaving the client-side version as the one that ships.",
    ],
  },
  sections: [
    {
      id: "problem",
      label: "Problem",
      heading: "Make a storefront feel complete before any backend exists",
      after: 0,
      body: [
        "The brief was a front end only. The README says it plainly: user authentication and database interactions are handled separately and are not part of this repository. That left a design problem rather than an integration problem. A visitor still expects to sign in, browse, search, add to a cart and place an order, and each of those screens had to behave convincingly with nothing to call.",
        "So the login page is a gate, not a check. Sign In and Sign Up both navigate straight to the home route, and the form even tells the visitor to enter any email and password. From there every route sits inside one layout shell, and the cart count in the navigation bar is the only piece of state that follows the reader from page to page.",
      ],
    },
    {
      id: "architecture",
      label: "Architecture",
      heading: "Six routes, one layout shell and a cart held in context",
      after: 2,
      body: [
        "React Router declares six routes. The root is the login page on its own; home, books, cart, profile and checkout each render inside MainLayout, which wraps them in the NavBar, the FloatingNavbar and the Footer. A CartProvider mounted above the router holds the cart as a plain array in useState and exposes three functions: addToCart appends, removeFromCart filters by id, and clearCart resets to empty.",
        "The data model is a 20-element array in the catalog component, each book carrying an id, title, author, category, price and discount. Seven titles are Finance, eight Psychology and five Philosophy, and discounts fall into five tiers from 5% to 25%. The home page shows the first ten covers on a CSS 3D ring: each item is rotated by its position times 36 degrees and pushed out 550px, and the ring completes one turn every 15 seconds.",
        "Clicking a carousel cover, a Buy Now button or the new-release Purchase button does not touch the cart. Each navigates to checkout with that one book in location state, which is why the checkout page has to accept more than one source.",
      ],
    },
    {
      id: "search",
      label: "Search",
      heading: "One substring test over three fields, re-run on every keystroke",
      after: 3,
      body: [
        "The search box lowercases the input and stores it in state. On each render the catalog is filtered with a single predicate: the term is a substring of the title, or of the author, or of the category. There is no debounce, no index and no ranking. With 20 books the full pass is cheap, and because Array.filter preserves order the results always appear in catalog order.",
        "The film traces two real queries against that data. Typing p, h, i narrows 20 books to 15, then 6, then 5: the sixth result at ph is an author match on Stephen R. Covey, which drops away at phi, leaving the five Philosophy titles found through their category. Typing m, a, n narrows 13 to 8 to 4, mixing two author hits with two title hits.",
      ],
    },
    {
      id: "checkout",
      label: "Checkout",
      heading: "Three possible order sources and a submit that only clears the cart",
      after: 5,
      body: [
        "Checkout decides what it is selling with one expression: state.cartItems, else a single state.book wrapped in an array, else the cart from context. Proceed to Checkout passes the cart as navigation state, Buy Now passes one book, and the floating bar's Checkout button passes nothing, so the third branch covers it. The form asks for a name, an email and a payment method with two options, Credit Card or PayPal.",
        "Submitting the form prevents the default, raises an alert and calls clearCart. No request leaves the browser. One consequence is visible in the code: the list arriving through navigation state is a snapshot, so after clearCart the checkout page still shows the books while the cart count in the NavBar drops to zero.",
        "The cart itself is deliberately simple. Adding the same book twice stores two entries rather than a quantity, Remove on either copy filters out both because it matches on id, and the total is a reduce over price, so the discounts shown on the catalog cards are not applied at the cart.",
      ],
    },
    {
      id: "outcome",
      label: "Outcome",
      heading: "A deployed front end that is honest about its boundary",
      body: [
        "The store is live on Netlify and the source is public on GitHub, with a gh-pages deploy script in the manifest. I built it alone between August and September 2024 and revisited it in 2025, when I tried a local json-server backend: a db.json of users, a catalog that fetched its JSON with axios, and a profile that read and updated users over HTTP. The db.json landed in one commit and was deleted the next day, and the commented-out versions still sit beneath the shipping components.",
        "What remains is a front end whose every feature can be verified by reading it: the routes, the predicate, the three cart operations and the checkout fallback chain. The profile page is a declared dummy with read-only fields and client-side password checks, and the login defines email and password validators it never calls.",
      ],
    },
  ],
} satisfies ProjectCopy;
