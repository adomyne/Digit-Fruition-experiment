/**
 * The Ads wheel's five services, in wheel order. Figma (142:1216) only
 * carries step 3, Streaming TV; the other four are placeholder copy until
 * the owner writes theirs.
 */
export const ADS_STEPS = [
  {
    title: 'Sponsored Products',
    body: 'Keyword and product-targeted ads that lift your listings to the top of search results and onto competitor pages.',
  },
  {
    title: 'Sponsored Brands',
    body: 'Headline, store and video ads that put your logo and a set of your products in front of shoppers as they search.',
  },
  {
    title: 'Streaming TV',
    body: 'This campaign integrates your brand into premium content on platforms like Prime Video and IMDb TV via Amazon Fire TV.',
  },
  {
    title: 'Sponsored Display',
    body: 'Retargeting ads that follow shoppers who viewed your products, on and off Amazon, and bring them back to buy.',
  },
  {
    title: 'Amazon DSP',
    body: 'Programmatic display and video ads that reach new audiences across Amazon sites, apps and partner publishers.',
  },
] as const;
