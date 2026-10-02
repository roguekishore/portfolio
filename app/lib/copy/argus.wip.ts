// Argus: case-study copy. Every claim traces to a file in roguekishore/Argus (see local/boards/argus.md).
import type { ProjectCopy } from "./types";

export default {
  title: "Civic Grievance Redressal System",
  sector: "Civic tech",
  year: "2026",
  description: "Municipal grievance redressal where Gemini classifies complaints from web or WhatsApp, SLA clocks escalate stalled ones to department heads and the commissioner, and only the citizen can close the loop.",
  stack: ["React", "Tailwind", "JavaScript", "Java", "Spring Boot", "MySQL", "AWS", "Docker", "Gemini"],
  intro: {
    heading: "Grievance redressal where only the citizen can close the loop",
    body: [
      "Argus is a municipal grievance system for a city's seven civic departments. Citizens report a pothole, a dead streetlight or a water outage through a web portal or a WhatsApp conversation; Gemini classifies the report into a category, priority and SLA; the department works it against a deadline; and the lifecycle only ends when the citizen who filed it accepts the fix.",
      "The product is the workflow rather than the forms. Complaint status is a pure state machine with a role policy on every edge and two hard guards: no RESOLVED without a resolution proof, no CLOSED without an accepted citizen sign-off. Escalation runs beside status on a six-hour scheduler, lifting overdue complaints to the department head after one day and to the municipal commissioner after three.",
      "I built it alone, from a 48-hour hackathon spec to a deployed Spring Boot and React application at argusweb.tech, later hardened with JWT auth, direct-to-S3 uploads and a GraalVM native build so it could share a small instance with other services.",
    ],
  },
  sections: [
    {
      id: "problem",
      label: "Problem",
      heading: "Complaints get lost between the citizen and the department",
      after: 0,
      body: [
        "Argus began as a 48-hour hackathon build of a public grievance system modeled on India's CPGRAMS. The spec's real challenge was not the forms but the workflow engine: route each complaint to the right department, enforce rules such as no resolution without department action, escalate stalled tickets to a higher authority and reject invalid state transitions.",
        "Cities generate complaints faster than manual tracking can follow, and a lost complaint looks the same as a resolved one. Argus treats the lifecycle as the product: two intake channels, one state machine, time-based escalation and a closing step that belongs to the citizen alone.",
      ],
    },
    {
      id: "intake",
      label: "Intake",
      heading: "Two channels, one gate, one classifier",
      after: 2,
      body: [
        "Web reports carry a Leaflet map pin and pass two checks before submission: Gemini validates that the text is a real civic complaint rather than something vague, and a debounced duplicate check searches 500 m around the pin for open complaints from the last 30 days, flagging any with an AI similarity score of 0.6 or more so the citizen can upvote instead of refiling.",
        "WhatsApp reports arrive through a Twilio webhook and a phase-locked agent. The Java service, not the model, moves each conversation through GREETING, AWAITING_REGISTRATION, REGISTERED_IDLE, AWAITING_ISSUE_DESCRIPTION, AWAITING_LOCATION, AWAITING_IMAGE_OPTIONAL and READY_TO_FILE, and the create_complaint tool can only be called in that last phase. A regex filter drops prompt-injection attempts before they reach Gemini.",
        "Every report is then classified by gemini-2.5-flash-lite at temperature 0.1 in JSON mode, which returns a category, priority, SLA days and a confidence score; three retries fall back to OTHER, LOW and 14 days. A seeded rulebook maps 9 categories to 7 departments with SLAs from 3 to 14 days. Below 0.7 confidence the complaint is flagged needsManualRouting and parked for an admin instead of being auto-assigned.",
      ],
    },
    {
      id: "lifecycle",
      label: "Lifecycle",
      heading: "A pure state machine, a role policy and two guards",
      after: 4,
      body: [
        "Status is a pure state machine: FILED to IN_PROGRESS to RESOLVED to CLOSED, with CANCELLED reachable from the first three and RESOLVED back to IN_PROGRESS reserved for dispute reopens. A separate policy says who may drive each edge: only SYSTEM starts work after classification, only STAFF or a DEPT_HEAD of the same department may resolve, and only the owning CITIZEN may close.",
        "Two guards sit on top of the policy. IN_PROGRESS to RESOLVED throws unless a ResolutionProof exists for the complaint, and RESOLVED to CLOSED throws unless an accepted citizen sign-off exists; SYSTEM is the one role allowed to bypass that for auto-close.",
        "Escalation is orthogonal to status and only ever rises. A scheduler runs every six hours over active complaints: more than one day past the SLA deadline lifts a complaint to L1, the department head, and raises its priority one level; more than three days lifts it to L2, the municipal commissioner, at CRITICAL. Each lift is an immutable EscalationEvent with a snapshot of the deadline, and an existence check keeps the job idempotent.",
      ],
    },
    {
      id: "signoff",
      label: "Sign-off",
      heading: "Only the citizen closes, and a dispute costs the department",
      after: 6,
      body: [
        "When staff attach proof, the complaint is RESOLVED, not finished. The citizen who filed it either accepts with a rating from 1 to 5, which closes it, or disputes with a reason and an optional counter-photo, which keeps it RESOLVED and notifies the department head.",
        "A department head who approves the dispute reopens the complaint to IN_PROGRESS with its priority raised one level, a new SLA of ceil(0.75 x original days), escalation reset to L0 and the old proofs deleted. There is no DISPUTED status; the dispute lives on the sign-off record so the state machine stays small.",
      ],
    },
    {
      id: "decisions",
      label: "Engineering",
      heading: "Decisions that kept it small, honest and cheap to run",
      after: 7,
      body: [
        "The WhatsApp agent splits responsibilities: Gemini handles language, the service owns conversation state and decides which tools are callable. The webhook returns empty TwiML immediately and replies asynchronously, so a slow model call never hits Twilio's 15-second timeout. I later replaced the Twilio SDK with java.net.http.HttpClient to shrink the dependency tree.",
        "The backend also builds as a GraalVM native image; the associations on Complaint were forced EAGER because lazy proxies broke under native compilation. For the shared t4g.small host the JVM image runs with a 200 MB heap cap and SerialGC alongside two other containers.",
        "Images never pass through the API. The browser requests a pre-signed PUT URL, uploads straight to S3 around CloudFront's request limits, then files the complaint with the S3 key. Authentication is a stateless JWT filter with only /api/auth and the Twilio webhook left public.",
      ],
    },
    {
      id: "outcome",
      label: "Outcome",
      heading: "Live at argusweb.tech, with an audit trail for every move",
      body: [
        "Argus runs at argusweb.tech with six roles from citizen to super admin, each with its own dashboard. Every significant action is recorded as one of 8 audit actions, and users receive one of 16 notification types, from SLA warnings to dispute approvals.",
        "Gamification is deliberately plain: citizens earn 10 points for filing and 20 when a complaint is resolved, with 5-per-upvote and 50-point clean-record bonuses defined and Silver, Gold and Platinum tiers at 100, 200 and 500 points; staff score 10 for each close before the deadline plus 2 per star.",
        "It is a single-author build with only the default Spring context and CRA tests, so the transition guards and the role policy, not a test suite, are what enforce the rules today.",
      ],
    },
  ],
} satisfies ProjectCopy;
