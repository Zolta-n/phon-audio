/**
 * Single source of truth for the identity and dates shown on the legal pages,
 * so /privacy, /terms and /disclosure can never disagree with each other.
 */

/** Name of the natural person operating the site (the GDPR "controller"). */
export const SITE_OPERATOR = "Zoltán Németh";

/** Contact address for privacy, legal and general enquiries. */
export const CONTACT_EMAIL = "zoltan.nemeth@phon.audio";

/**
 * Postal address of the controller.
 *
 * GDPR Art. 13 requires the controller's contact details, and several EU
 * jurisdictions (notably Germany's TMG §5 Impressum duty) expect a postal
 * address on a public site. Left empty deliberately rather than invented —
 * fill this in before promoting the site widely, and it will render
 * automatically wherever the contact block appears.
 */
export const POSTAL_ADDRESS = "";

export const SITE_NAME = "Phon.Audio";
export const SITE_URL = "https://phon.audio";

/** Date the legal documents were last revised (ISO, YYYY-MM-DD). */
export const LEGAL_LAST_UPDATED = "2026-08-07";

/**
 * The exact sentence the Amazon Associates Operating Agreement requires to be
 * displayed clearly and conspicuously wherever affiliate links appear. Do not
 * reword it — the wording is prescribed.
 */
export const AMAZON_DISCLOSURE = "As an Amazon Associate I earn from qualifying purchases.";
