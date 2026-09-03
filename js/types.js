// Type definitions only (JSDoc). No runtime code. No build step required —
// editors with a TS language server (e.g. VS Code) type-check plain .js
// files against these @typedef blocks automatically.

/**
 * @typedef {Object} Provider
 * @property {string} id
 * @property {string} name
 * @property {string} specialty
 */

/**
 * @typedef {Object} Slot
 * @property {string} id
 * @property {string} providerId
 * @property {string} day        // e.g. "Monday" | "Tuesday" | "Wednesday"
 * @property {string} time       // e.g. "09:00"
 * @property {"morning"|"afternoon"} timeRange
 */

/**
 * @typedef {Object} SearchProvidersInput
 * @property {string} name
 */

/**
 * @typedef {Object} ListAvailableSlotsInput
 * @property {string} providerId
 * @property {string} [day]
 * @property {"morning"|"afternoon"} [timeRange]
 */

/**
 * @typedef {Object} SelectSlotInput
 * @property {string} slotId
 */

/**
 * @typedef {Object} FillIntakeFormInput
 * @property {string} reason
 * @property {string} [notes]
 */

/**
 * @typedef {Object} ToolTextContent
 * @property {"text"} type
 * @property {string} text
 */

/**
 * @typedef {Object} ToolResult
 * @property {ToolTextContent[]} content
 */

/**
 * @typedef {Object} AppState
 * @property {Provider|null} selectedProvider
 * @property {Slot|null} selectedSlot
 * @property {{reason: string, notes: string}} intakeForm
 * @property {"idle"|"pending-confirmation"|"confirmed"} bookingStatus
 */

// Exported as an empty object — this file's value is purely its JSDoc types,
// but ES module syntax requires something exportable if ever imported.
export {};
