/**
 * Post object returned by the Wordpress API
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
export interface Post {
  id: number;
  date: string;
  date_gmt: string;
  name?: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: Title;
  content: Content;
  excerpt: Excerpt;
  acf?: Acf;
  yoast_head: string;
  yoast_head_json: YoastHeadJson;
  featured_media?: number;
  categories?: number[];
  tags?: number[];
}

/**
 * One of the tyes returned by the Wordpress API
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
interface Title {
  rendered: string;
}

/**
 * One of the tyes returned by the Wordpress API
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
interface Content {
  rendered: string;
  protected: boolean;
}

/**
 * One of the tyes returned by the Wordpress API
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
interface Excerpt {
  rendered: string;
  protected: boolean;
}

/**
 * Custom fields object returned by the Wordpress API
 * These are fields added using the Advanced Custom Fields plugin
 * These fields are used to store additional data for the post
 *
 * See src/components/WebsiteSections.tsx to understand section rendering
 *
 * @param sections - Sections of the page. Each section is a different type of content block.
 * @param full_width - Whether the page should be full width or not.
 *
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
interface Acf {
  sections: IrminWebsiteSection[];
  full_width: boolean;
}

/**
 * Options for the different types of sections on the website
 *
 * See src/components/WebsiteSections.tsx to understand section rendering
 *
 * @example See `/src/types/examples/wordpressObjects.ts`
 */
export type IrminWebsiteSection =
  | NewsletterSection
  | TestimonialSection
  | LogoCloudSection
  | HeroSection
  | PriceSection
  | FAQSection
  | CTADarkSection
  | CTASection
  | TeamSection
  | FeaturesSection
  | ContentSection
  | ContactSection
  | CareersSection
  | NumbersSection
  | ArticlesSection;

/**
 * Type of props passed to Numbers section on the website from Wordpress API
 *
 * @param acf_fc_layout - The type of section, in this case 'numbers'
 * @param title - The title of the section
 * @param subtitle - The subtitle of the section
 * @param description - The description of the section
 * @param metrics - The metrics displayed in the section
 *
 * @example See `src/components/website/websiteNumbersSection.tsx`
 */
export interface NumbersSection {
  acf_fc_layout: 'numbers';
  title: string;
  subtitle: string;
  description: string;
  metrics: Metric[];
}

/**
 * Metric displayed in the numbers section
 * @param title - The title of the metric
 * @param description - The description of the metric
 */
interface Metric {
  title: string;
  description: string;
}

/**
 * Type of props passed to Articles section on the website from Wordpress API
 *
 * @param acf_fc_layout - The type of section, in this case 'articles'
 * @param title - The title of the section
 * @param subtitle - The subtitle of the section
 * @param description - The description of the section
 *
 * @example See `src/components/website/websiteBlogPosts.tsx`
 */
export interface ArticlesSection {
  acf_fc_layout: 'articles';
  title: string;
  subtitle: string;
  description: string;
}

/**
 * Type of props passed to Careers section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'careers'
 * @param title - The title of the section
 * @param subtitle - The subtitle of the section
 * @param description - The description of the section
 * @param open_positions - The open positions displayed in the section
 * @example See `src/components/website/websiteCareersSection.tsx`
 */
export interface CareersSection {
  acf_fc_layout: 'careers';
  title: string;
  subtitle: string;
  description: string;
  open_positions: OpenPosition[];
}

/**
 * Single open position displayed in the careers section
 * @param role - The role of the position
 * @param location - The location of the position
 * @param note - A note about the position
 * @param description - The description of the position
 * @param link - The link to the position
 * @example See `src/components/website/websiteCareersSection.tsx`
 */
interface OpenPosition {
  role: string;
  location: string;
  note: string;
  description: string;
  link: string | WordpressLink;
}

/**
 * Type of props passed to Contact section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'contact'
 * @param title - The title of the section
 * @param subtitle - The subtitle of the section
 * @param description - The description of the section
 * @param buttons - The buttons displayed in the section
 * @param contact_methods - The contact methods displayed in the section
 * @param socials - The socials displayed in the section
 * @example See `src/components/website/websiteContactSection.tsx`
 */
export interface ContactSection {
  acf_fc_layout: 'contact';
  title: string;
  subtitle: string;
  description: string;
  buttons: Button[];
  contact_methods: ContactMethod[];
  socials: Social[];
}
/**
 * Single contact method displayed in the contact section
 * @param title - The title of the contact method
 * @param icon - The icon of the contact method
 * @param detail - The detail of the contact method
 */
interface ContactMethod {
  title: string;
  icon: string;
  detail: string;
}

/**
 * Single social displayed in the contact section
 * @param icon - The icon of the social
 * @param link - The link of the social
 * @example See `src/components/website/websiteContactSection.tsx`
 */
interface Social {
  icon: string;
  link: string | WordpressLink;
}

/**
 * Type of props passed to Content section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'content'
 * @param title - The title of the section
 * @param subtitle - The subtitle of the section
 * @param description - The description of the section
 * @param features - The features displayed in the section
 * @param main_image - The main image of the section
 * @param image_first - Whether the image should be displayed first or not
 * @example See `src/components/website/websiteContentSection.tsx`
 */
export interface ContentSection {
  acf_fc_layout: 'content';
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  main_image: string | number;
  image_first: boolean;
}

/**
 * Type of props passed to Features section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'features'
 * @param title - The title of the section
 * @param subtitle - The subtitle of the section
 * @param description - The description of the section
 * @param features - The features displayed in the section
 * @param image - The image of the section
 * @example See `src/components/website/websiteFeaturesSection.tsx`
 */
export interface FeaturesSection {
  acf_fc_layout: 'features';
  title: string;
  subtitle: string;
  description: string;
  features: Feature[];
  image: string;
}

/**
 * Single feature displayed in the features and content sections
 * @param title - The title of the feature
 * @param description - The description of the feature
 * @param icon - The icon of the feature
 */
interface Feature {
  title: string;
  description: string;
  icon: string;
}

/**
 * Type of props passed to Team section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'team'
 * @param title - The title of the section
 * @param subtitle - The subtitle of the section
 * @param description - The description of the section
 * @param buttons - The buttons displayed in the section
 * @param people - The people displayed in the section
 * @example See `src/components/website/websiteTeamSection.tsx`
 */
export interface TeamSection {
  acf_fc_layout: 'team';
  title: string;
  subtitle: string;
  description: string;
  buttons: Button[];
  people: People[];
}

/**
 * Single person displayed in the team section
 * @param name - The name of the person
 * @param title - The title of the person
 * @param description - The description of the person
 * @param profile - The profile of the person
 * @example See `src/components/website/websiteTeamSection.tsx`
 */
interface People {
  name: string;
  title: string;
  description: string;
  profile: string | number;
}

/**
 * Type of props passed to CTA section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'cta'
 * @param title - The title of the section
 * @param bullet_points - The bullet points displayed in the section
 * @param buttons - The buttons displayed in the section
 * @param image - The image of the section
 * @example See `src/components/website/websiteCTASection.tsx`
 */
export interface CTASection {
  acf_fc_layout: string;
  title: string;
  bullet_points: BulletPoint[];
  buttons: Button[];
  image: string | number;
}

/**
 * Type of props passed to CTA dark section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'cta_dark'
 * @param title - The title of the section
 * @param description - The description of the section
 * @param buttons - The buttons displayed in the section
 * @example See `src/components/website/websiteCTADarkSection.tsx`
 */
export interface CTADarkSection {
  acf_fc_layout: 'cta_dark';
  title: string;
  description: string;
  buttons: Button[];
}

/**
 * Type of props passed to FAQ section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'faq'
 * @param title - The title of the section
 * @param subtitle - The subtitle of the section
 * @param description - The description of the section
 * @param questions - The questions displayed in the section
 * @example See `src/components/website/websiteFAQSection.tsx`
 */
export interface FAQSection {
  acf_fc_layout: 'faq';
  title: string;
  subtitle: string;
  description: string;
  questions: Question[];
}

/**
 * Single question displayed in the FAQ section
 * @param title - The title of the question
 * @param description - The description of the question
 * @param icon - The icon of the question
 */
interface Question {
  title: string;
  description: string;
  icon: string;
}

/**
 * Type of props passed to Price section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'prices'
 * @param title - The title of the section
 * @param subtitle - The subtitle of the section
 * @param description - The description of the section
 * @param annual_saving_note - The annual saving note of the section
 * @param prices - The prices displayed in the section
 * @example See `src/components/website/websitePriceSection.tsx`
 */
export interface PriceSection {
  acf_fc_layout: 'prices';
  title: string;
  subtitle: string;
  description: string;
  annual_saving_note: string;
  prices: Price[];
}

/**
 * Single price displayed in the price section
 * @param title - The title of the price
 * @param subtitle - The subtitle of the price
 * @param monthly_price - The monthly price of the price
 * @param annual_price - The annual price of the price
 * @param bullet_points - The bullet points of the price
 * @param link_text - The link text of the price
 * @param link - The link of the price
 * @example See `src/components/website/websitePriceSection.tsx`
 */
interface Price {
  title: string;
  subtitle: string;
  monthly_price: number;
  annual_price: number;
  bullet_points: BulletPoint[];
  link_text: string;
  link: string | WordpressLink;
}

/**
 * Single bullet point displayed in the price and CTA sections
 * @param title - The title of the bullet point
 */
interface BulletPoint {
  title: string;
}

/**
 * Type of props passed to Hero section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'hero'
 * @param title_parts - The title parts displayed in the section
 * @param description - The description of the section
 * @param buttons - The buttons displayed in the section
 * @param video_placeholder - The video placeholder of the section
 * @param video - The video of the section
 * @example See `src/components/website/websiteHeroSection.tsx`
 */
export interface HeroSection {
  acf_fc_layout: 'hero';
  title_parts: TitlePart[];
  description: string;
  buttons: Button[];
  video_placeholder: string | number;
  video: string | number;
}

/**
 * Single title part displayed in the hero section
 * @param title - The title of the title part
 * @param green - Whether the title part should be green or not
 */
interface TitlePart {
  title: string;
  green: boolean;
}

/**
 * Type of props passed to Testimonial section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'testimonials'
 * @param testimonials - The testimonials displayed in the section
 */
export interface TestimonialSection {
  acf_fc_layout: 'testimonials';
  testimonials: Testimonial[];
}

/**
 * Single testimonial displayed in the testimonial section
 * @param image - The image of the testimonial
 * @param name - The name of the testimonial
 * @param title - The title of the testimonial
 * @param quote - The quote of the testimonial
 */
interface Testimonial {
  image: string | number;
  name: string;
  title: string;
  quote: string;
}

/**
 * Type of props passed to Logo cloud section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'logo_cloud'
 * @param title - The title of the section
 * @param logos - The logos displayed in the section
 * @example See `src/components/website/websiteLogoCloudSection.tsx`
 */
export interface LogoCloudSection {
  acf_fc_layout: 'logo_cloud';
  title: string;
  logos: Logo[];
}

/**
 * Single logo displayed in the logo cloud section
 * @param logo - The logo of the logo
 * @param title - The title of the logo
 */
interface Logo {
  logo: string | number;
  title: string;
}

/**
 * Type of props passed to Newsletter section on the website from Wordpress API
 * @param acf_fc_layout - The type of section, in this case 'newsletter'
 * @param title - The title of the section
 * @param subtitle - The subtitle of the section
 * @example See `src/components/website/websiteNewsletterSection.tsx`
 */
export interface NewsletterSection {
  acf_fc_layout: 'newsletter';
  title: string;
  subtitle: string;
}

/**
 * When a section gets a Button object, it can be rendered as a button
 * This is the type of the button object returned by the Wordpress API
 */
interface Button {
  text: string;
  link: string | WordpressLink;
  icon?: string | null;
  variant: 'link' | 'outline' | 'solid' | 'gradient';
  color_scheme:
    | 'primary'
    | 'secondary'
    | 'tertiary'
    | 'gray'
    | 'black'
    | 'light';
}

/**
 * When a section gets a Link object, it can be rendered.
 * This is the type of the link object returned by the Wordpress API
 */
export interface WordpressLink {
  title: string;
  url: string;
  target: string;
}

/**
 * SEO object returned by the Wordpress API
 */
interface YoastHeadJson {
  title?: string;
  description?: string;
  author?: string;
  robots: Robots;
  og_locale?: string;
  og_type?: string;
  og_title?: string;
  og_description?: string;
  og_url?: string;
  og_site_name?: string;
  article_modified_time?: string;
  og_image?: OgImage[];
  twitter_card?: string;
  twitter_misc?: {
    'Written by': string;
    'Estimated reading time': string;
  };
  schema?: Schema;
}

/**
 * Robots object returned by the Wordpress API
 * This should not be used for anything.
 */
interface Robots {
  index: string;
  follow: string;
  'max-snippet': string;
  'max-image-preview': string;
  'max-video-preview': string;
}

interface OgImage {
  url: string;
  width: number;
  height: number;
  type: string;
}

interface Schema {
  '@context': string;
  '@graph': Graph[];
}

interface Graph {
  '@type': string;
  '@id': string;
  url?: string;
  name?: string;
  isPartOf?: IsPartOf;
  primaryImageOfPage?: PrimaryImageOfPage;
  image?: Image;
  thumbnailUrl?: string;
  datePublished?: string;
  dateModified?: string;
  breadcrumb?: Breadcrumb;
  inLanguage?: string;
  contentUrl?: string;
  width?: number;
  height?: number;
  itemListElement?: ItemListElement[];
  description?: string;
  headline?: string;
  wordCount?: number;
  articleSection?: string[];
  publisher?: { '@id': string };
  logo?: {
    '@type': string;
    inLanguage: string;
    '@id': string;
    url: string;
    contentUrl: string;
    width: number;
    height: number;
    caption: string;
  };
  author?: {
    name: string;
    '@id': string;
  };
  potentialAction?: {
    '@type': string;
    target:
      | {
          '@type': string;
          urlTemplate: string;
        }
      | string[];
    'query-input'?: string;
  }[];
}

interface IsPartOf {
  '@id': string;
}

interface PrimaryImageOfPage {
  '@id': string;
}

interface Image {
  '@id': string;
}

interface Breadcrumb {
  '@id': string;
}

interface ItemListElement {
  '@type': string;
  position: number;
  name: string;
  item?: string;
}

export type Menu = MenuItem[];

export interface MenuItem {
  ID: number;
  title: string;
  url: string;
  menu_order: number;
  menu_item_parent: string;
}

export interface Media {
  id: number;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: Title;
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details: MediaDetails;
  post: number;
  source_url: string;
}

export interface MediaDetails {
  width: number;
  height: number;
  file: string;
  filesize: number;
  sizes: Sizes;
  image_meta: ImageMeta;
}

export interface Sizes {
  medium: Medium;
  thumbnail: Thumbnail;
  full: Full;
}

export interface Medium {
  file: string;
  width: number;
  height: number;
  filesize: number;
  mime_type: string;
  source_url: string;
}

export interface Thumbnail {
  file: string;
  width: number;
  height: number;
  filesize: number;
  mime_type: string;
  source_url: string;
}

export interface Full {
  file: string;
  width: number;
  height: number;
  mime_type: string;
  source_url: string;
}

export interface ImageMeta {
  aperture: string;
  credit: string;
  camera: string;
  caption: string;
  created_timestamp: string;
  copyright: string;
  focal_length: string;
  iso: string;
  shutter_speed: string;
  title: string;
  orientation: string;
}
