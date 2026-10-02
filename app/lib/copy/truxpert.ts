// Truxpert: case-study copy. Every claim traces to a file in local/repos/Truxpert; see local/boards/truxpert.md.
import type { ProjectCopy } from "./types";

export default {
  title: "Food Truck Permit Pipeline",
  sector: "SaaS",
  year: "2024",
  description:
    "A multi-role permit pipeline for food-truck vendors. Each truck's application is routed to a reviewer and then an inspector, and every status change is mirrored onto the truck itself.",
  stack: ["React", "React Router", "Tailwind", "Axios", "Java", "Spring Boot", "Spring Data JPA", "MySQL", "Docker", "GraalVM"],
  intro: {
    heading: "Every truck carries its own status through review and inspection",
    body: [
      "A food-truck vendor runs brands, and each brand runs trucks, but a truck cannot trade until a permitting team has reviewed its paperwork and inspected the vehicle. That puts five kinds of user on one record: the vendor who files, the admin who routes, the reviewer who decides, the inspector who visits, and a super admin who watches the totals. TruXpert is the system that keeps them in agreement.",
      "The backend is Spring Boot over MySQL, modeled as a tree: Vendor to Brand to FoodTruck, with each truck owning an Application, its Documents, a one-to-one Review and a one-to-one Inspection. Status is the contract between roles. An application is SUBMITTED, IN_REVIEW, APPROVED or REJECTED; an inspection runs IN_PROGRESS to PASS or FAIL; and the service layer copies each new application status onto the truck row, so vendor screens never join through the review.",
      "The React 19 front end switches on the logged-in role to show a vendor portal, an admin queue, a reviewer desk, an inspector list or the super-admin dashboard, with vendor login kept separate from staff login. A password-gated seeder fills a demo database from a fixed random seed, and the service ships two ways: a JVM container tuned to a 200 MB heap and a GraalVM native image.",
    ],
  },
  sections: [
    {
      id: "problem",
      label: "Problem",
      heading: "One truck, five roles, and no shared definition of where it stands",
      after: 0,
      body: [
        "A vendor registers brands and the trucks under them. A new truck starts as SUBMITTED, with its application and document rows created in the same service call. From there the record changes hands: an admin assigns a reviewer, the reviewer approves or rejects, an admin assigns an inspector to approved trucks, and the inspector passes or fails the visit. The seeded demo mirrors a real queue, where close to half of all applications are still waiting for anyone to pick them up.",
        "Four application states, three review states, three inspection results, four staff roles.",
      ],
    },
    {
      id: "routing",
      label: "Routing",
      heading: "Assignment guards and a status mirror keep every screen in agreement",
      after: 3,
      body: [
        "Assigning a reviewer is one endpoint with four refusals in front of it: the application must not already be APPROVED or REJECTED, an existing review must not already be decided, the chosen user must hold the REVIEWER role, and an IN_PROGRESS review is reassigned rather than duplicated. On success the review opens IN_PROGRESS and the application moves to IN_REVIEW.",
        "A reviewer's decision maps straight across: APPROVED and REJECTED set the same status on the application, and IN_PROGRESS maps back to IN_REVIEW. Both the application service and the review service then write that status onto the FoodTruck row, so the vendor's truck cards and the admin's APPROVED filter read one denormalized column instead of joining through reviews.",
        "Inspection follows the same shape. Assignment checks the INSPECTOR role and opens the inspection IN_PROGRESS; completion accepts only PASS or FAIL.",
      ],
    },
    {
      id: "decisions",
      label: "Decisions",
      heading: "Deterministic demo data, protected accounts and a native image build",
      after: 5,
      body: [
        "The seeder is off at boot and runs only through a password-gated endpoint, with a run-once guard and a separate force route. It draws from a fixed random seed, so every demo database is the same: seven vendors, two to four trucks per brand, five document templates per application, and outcomes split at roughly 30% approved, 10% rejected, 15% in review and 45% untouched. Menus of three to five items are added only to trucks that passed inspection.",
        "Demo logins are protected on the server: edits and deletes against those accounts return 403, and super-admin accounts cannot be created or removed through the API.",
        "Deployment has two profiles: a JVM image on Temurin 17 pinned to a 200 MB heap with the serial collector, and a GraalVM native image on a slim Debian base running as a non-root user. Getting the native build to work meant forcing every JPA association to EAGER fetch and declaring entity accessors and constructors explicitly.",
      ],
    },
    {
      id: "outcome",
      label: "Outcome",
      heading: "A complete vendor-to-dashboard flow, with the auth gap called out",
      body: [
        "The result is one Spring Boot service and one React app covering registration, document records, assignment, review, inspection, menus and a super-admin dashboard that counts applications per status and inspections per result and reports rounded approval and pass rates. Admin lists are paged and sortable, with an unassigned filter backed by a review-is-null query, and the API is documented through springdoc OpenAPI.",
        "Known gaps, stated plainly: passwords are compared as plain text and the Spring Security and JWT classes are entirely commented out, so role checks live in the controllers and services only. Document uploads store a generated path rather than the file. Both are the first things I would change before real traffic.",
      ],
    },
  ],
} satisfies ProjectCopy;
