# Storefront Imagery — Sources & Licensing

All storefront images are sourced from [Pexels](https://www.pexels.com/) under the
[Pexels License](https://www.pexels.com/license/), which permits free commercial use,
modification and redistribution **without attribution**. Originals are downloaded
already optimized (`auto=compress&cs=tinysrgb`); each photo remains identifiable by its
photo ID below.

## Department covers

| File | Pexels photo ID | Description |
| --- | --- | --- |
| `department-fashion.jpg` | [2249249](https://www.pexels.com/photo/2249249/) | Elegant selection of clothes on a minimalist rack in a modern interior |
| `department-electronics.jpg` | [2919003](https://www.pexels.com/photo/2919003/) | High-quality black studio headphones close-up |
| `department-cosmetics.jpg` | [4889710](https://www.pexels.com/photo/4889710/) | Top view of luxury makeup items — palette, highlighter and perfume on a marble surface |
| `department-home.jpg` | [13722886](https://www.pexels.com/photo/13722886/) | Sleek modern living room with dark tones and ambient lighting |

## Editorial imagery

| File | Pexels photo ID | Description |
| --- | --- | --- |
| `hero-editorial.jpg` | [325876](https://www.pexels.com/photo/325876/) | Black-and-white boutique interior with clothes on racks |
| `promo-editorial.jpg` | [34964854](https://www.pexels.com/photo/34964854/) | Elegant modern living room — blue tufted sofa and marble wall |
| `retail-editorial.jpg` | [8311878](https://www.pexels.com/photo/8311878/) | Stylish clothing store interior with modern retail display |
| `cta-editorial.jpg` | [13673656](https://www.pexels.com/photo/13673656/) | Stylish black suit on a mannequin in a boutique window, warm lighting |
| `flatlay-editorial.jpg` | [7383102](https://www.pexels.com/photo/7383102/) | Flat lay of a black dress, gold earrings and hangers on a patterned rug |

## Notes

- Images are served from `/images/...` (same-origin) so they pass the same-origin path
  check in `src/components/storefront/product-image.tsx` and are optimized/rendered
  responsively with Next.js `<Image>`.
- If a Pexels download URL changes or a photo is removed, replace the file with an
  equivalent licensed photo and update this table.
- Pexels does not require attribution, but keeping this table preserves provenance.