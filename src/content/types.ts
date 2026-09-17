/**
 * The typed content layer.
 *
 * This is the only place data lives (CLAUDE.md -> Structure). Components take typed
 * props and read through the accessors in `./index`; nothing imports the fixture.
 *
 * Phase 2 replaces the fixture behind these types with Payload queries. Every shape
 * here is therefore designed to survive that swap: no field exists because it was
 * convenient for today's hardcoded object.
 */

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/**
 * Identifier aliases. Deliberately plain `string` rather than branded types: the
 * alias costs nothing now and makes branding a one-line change later that no call
 * site has to absorb.
 */
export type TenantId = string
export type PaletteId = string
export type MediaAssetId = string
export type EventId = string
export type StoryId = string

/**
 * ISO 8601 instant, e.g. '2025-02-22T20:00:00+02:00'.
 *
 * Dates are strings in the data and are parsed at the boundary; a `Date` never
 * enters a fixture. The date-only form ('2025-02-22') is also valid and is used
 * where a published source gave a day but no start time. Consumers that render a
 * clock time must handle both.
 */
export type IsoDateTime = string

/** Absolute URL. */
export type Url = string

/**
 * A CSS colour value. Emitted server-side as a custom property and consumed through
 * Tailwind's `@theme`; never read in client JS on first paint.
 */
export type ColourValue = string

// ---------------------------------------------------------------------------
// Tenancy
// ---------------------------------------------------------------------------

/**
 * Carried by every tenant-owned content type (CLAUDE.md hard rule 2). Extending a
 * shared interface rather than repeating the field makes the rule greppable and
 * makes "did we miss one?" a question the compiler answers.
 */
export interface TenantScoped {
  readonly tenantId: TenantId
}

/**
 * The tenant itself. Does not extend TenantScoped: its `id` *is* the tenant id, and
 * a self-referential `tenantId` would be a second source of truth for one value.
 */
export interface Tenant {
  readonly id: TenantId
  readonly slug: string
  readonly name: string
  readonly primaryDomain: string
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

/**
 * Closed set. Adding a platform is a deliberate, compile-checked change rather than
 * a free-text value that silently has no icon and no link handling.
 */
export type SocialPlatform = 'instagram' | 'tiktok' | 'youtube'

/**
 * Embedded value object, owned by the Profile that contains it. No `id` and no
 * `tenantId`: it is not independently addressable, so a tenant id here would only
 * ever duplicate its parent's.
 */
export interface SocialLink {
  readonly platform: SocialPlatform
  readonly url: Url
  readonly handle: string
}

/**
 * An image, served from R2 (CLAUDE.md hard rule 3).
 *
 * Carries `tenantId` despite not being in the original field list: it has its own
 * `id`, so Phase 2 makes it an addressable Payload collection, and a media library
 * without tenant scoping is a cross-tenant leak in Phase 5.
 *
 * `width`, `height` and `blurDataUrl` are all required because the perf budget
 * demands explicit dimensions and blur placeholders on every image, and CLS < 0.05
 * is a build failure rather than a guideline.
 */
export interface MediaAsset extends TenantScoped {
  readonly id: MediaAssetId
  readonly url: Url
  readonly alt: string
  readonly width: number
  readonly height: number
  readonly blurDataUrl: string
  /**
   * Public attribution line, e.g. 'Craig Kolesky / Red Bull Content Pool'. Null when
   * the asset needs no visible credit.
   */
  readonly credit: string | null
  /**
   * Internal provenance: where this file came from, for the rights tracking in
   * PROJECT.md section 9. Required, so every asset is answerable.
   */
  readonly source: string
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface Profile extends TenantScoped {
  readonly name: string
  /** The persona he performs under, e.g. 'Minister of Cape Town'. */
  readonly personaTitle: string
  readonly tagline: string
  readonly bio: string
  readonly homeCity: string
  readonly bookingEmail: string
  readonly socials: readonly SocialLink[]
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

/**
 * Drives the status stamp in the ledger rows. A string-literal union rather than
 * `isSoldOut` / `isCancelled` booleans, which would permit nonsense combinations.
 */
export type EventStatus = 'confirmed' | 'sold-out' | 'past' | 'cancelled'

export interface Event extends TenantScoped {
  readonly id: EventId
  /**
   * Human-readable identifier, rendered as a design element in the ledger rows.
   * Authored data, not derived, so it stays stable if ordering or ids change.
   */
  readonly reference: string
  readonly title: string
  /** Null where the source published a date and city but no venue. */
  readonly venue: string | null
  readonly city: string
  readonly country: string
  readonly startsAt: IsoDateTime
  /** Null where no end time was announced, which is most gigs. */
  readonly endsAt: IsoDateTime | null
  /** His role at this engagement, e.g. 'Host / MC'. */
  readonly role: string
  /** Null until a cleared flyer asset exists. Never a stand-in asset with no URL. */
  readonly flyer: MediaAsset | null
  /** Null when tickets are not on sale, are sold out, or the event has passed. */
  readonly ticketUrl: Url | null
  readonly status: EventStatus
  /** Other billed acts. Empty where the bill was not published. */
  readonly lineup: readonly string[]
}

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export interface Story extends TenantScoped {
  readonly id: StoryId
  readonly slug: string
  readonly title: string
  readonly excerpt: string
  /**
   * Markdown. Phase 2 serialises Payload's rich-text output to markdown inside the
   * accessor so this shape, and therefore the component layer, does not move.
   */
  readonly body: string
  readonly coverImage: MediaAsset | null
  readonly publishedAt: IsoDateTime
  readonly tags: readonly string[]
}

// ---------------------------------------------------------------------------
// Theming
// ---------------------------------------------------------------------------

/**
 * A curated palette. Platform-owned, not tenant-owned, and therefore not
 * TenantScoped: CLAUDE.md gives the client a choice of curated palettes plus one
 * accent slot, never a colour picker. Per-tenant palette rows would mean fifty
 * copies of the same five colours and no way to revise one centrally.
 */
export interface Palette {
  readonly id: PaletteId
  readonly name: string
  readonly ink: ColourValue
  readonly paper: ColourValue
  readonly seal: ColourValue
  readonly carnival: ColourValue
  readonly muted: ColourValue
}

/** A tenant's theme choice: which curated palette, plus the one accent slot. */
export interface Theme extends TenantScoped {
  readonly paletteId: PaletteId
  /** The single accent the client may override. Null means use the palette's own. */
  readonly accentOverride: ColourValue | null
  readonly displayFont: string
  readonly bodyFont: string
}

/**
 * A Theme with its palette already joined. This is what `getTheme()` returns.
 *
 * The stored Theme holds a `paletteId`, but the render layer needs colours, and
 * making every caller resolve that lookup is exactly how a literal colour ends up
 * inside a component. Resolving once in the accessor keeps hard rule 1 enforceable.
 */
export interface ResolvedTheme extends TenantScoped {
  readonly palette: Palette
  readonly accentOverride: ColourValue | null
  readonly displayFont: string
  readonly bodyFont: string
}

// ---------------------------------------------------------------------------
// Composed root
// ---------------------------------------------------------------------------

/**
 * The whole content graph for one tenant.
 *
 * `palettes` is the curated catalogue the tenant's Theme selects from; it is not
 * tenant-owned and lives here only because there is a single data source today.
 * MediaAssets are embedded by value at their point of use rather than held in a
 * top-level collection, which is what the fixture can honestly represent now; Phase
 * 2 turns those into resolved relations without this shape changing.
 */
export interface SiteContent {
  readonly tenant: Tenant
  readonly profile: Profile
  readonly theme: Theme
  readonly palettes: readonly Palette[]
  readonly events: readonly Event[]
  readonly stories: readonly Story[]
}
