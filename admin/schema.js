export const CMS_SCHEMA = [
  {
    id: "site",
    title: "Thông tin chung",
    fields: [
      { path: "site.brand_name", label: "Tên thương hiệu", type: "string" },
      { path: "site.tagline", label: "Tagline", type: "string" },
      { path: "site.hotline", label: "Hotline", type: "string" },
      { path: "site.email", label: "Email", type: "string" },
      { path: "site.address", label: "Địa chỉ", type: "text" },
      {
        id: "payments",
        title: "Thanh toán (Checkout)",
        fields: [
          { path: "site.payments.bank_name", label: "Ngân hàng", type: "string" },
          { path: "site.payments.bank_account_number", label: "Số tài khoản", type: "string" },
          { path: "site.payments.bank_account_name", label: "Chủ tài khoản", type: "string" },
          { path: "site.payments.momo_phone", label: "MoMo (SĐT)", type: "string" }
        ]
      }
    ]
  },
  {
    id: "home",
    title: "Trang chủ",
    fields: [
      { path: "home.slides", label: "Slide images (URL)", type: "list_string" },
      {
        id: "hero",
        title: "Hero",
        fields: [
          { path: "home.hero.eyebrow", label: "Eyebrow", type: "string" },
          { path: "home.hero.title", label: "Title", type: "string" },
          { path: "home.hero.subtitle", label: "Subtitle", type: "string" },
          { path: "home.hero.description", label: "Description", type: "text" },
          { path: "home.hero.image", label: "Hero image (URL)", type: "image" },
          { path: "home.hero.primary_label", label: "Primary button label", type: "string" },
          { path: "home.hero.primary_link", label: "Primary button link", type: "string" },
          { path: "home.hero.secondary_label", label: "Secondary button label", type: "string" },
          { path: "home.hero.secondary_link", label: "Secondary button link", type: "string" }
        ]
      },
      { path: "home.metrics", label: "Metrics", type: "list_object", itemTitlePath: "label", fields: [
        { path: "value", label: "Value", type: "string" },
        { path: "label", label: "Label", type: "string" }
      ]},
      { path: "home.features", label: "Features", type: "list_object", itemTitlePath: "title", fields: [
        { path: "title", label: "Title", type: "string" },
        { path: "text", label: "Text", type: "text" }
      ]},
      { path: "home.previews", label: "Previews", type: "list_object", itemTitlePath: "title", fields: [
        { path: "title", label: "Title", type: "string" },
        { path: "text", label: "Text", type: "text" },
        { path: "label", label: "Button label", type: "string" },
        { path: "link", label: "Button link", type: "string" }
      ]}
    ]
  },
  {
    id: "about",
    title: "Giới thiệu",
    fields: [
      { path: "about.eyebrow", label: "Eyebrow", type: "string" },
      { path: "about.title", label: "Title", type: "string" },
      { path: "about.description", label: "Description", type: "text" },
      { path: "about.story_title", label: "Story title", type: "string" },
      { path: "about.story_text", label: "Story text", type: "text" },
      { path: "about.story_image", label: "Story image (URL)", type: "image" },
      { path: "about.points", label: "Points", type: "list_object", itemTitlePath: "title", fields: [
        { path: "title", label: "Title", type: "string" },
        { path: "text", label: "Text", type: "text" }
      ]}
    ]
  },
  {
    id: "products",
    title: "Sản phẩm",
    fields: [
      { path: "products.eyebrow", label: "Eyebrow", type: "string" },
      { path: "products.title", label: "Title", type: "string" },
      { path: "products.description", label: "Description", type: "text" },
      { path: "products.items", label: "Items", type: "list_object", itemTitlePath: "title", fields: [
        { path: "title", label: "Title", type: "string" },
        { path: "subtitle", label: "Subtitle", type: "string" },
        { path: "slug", label: "Slug", type: "string" },
        { path: "category", label: "Category", type: "select", options: ["all", "bestseller", "combo"] },
        { path: "image", label: "Image (URL)", type: "image" },
        { path: "price_vnd", label: "Giá niêm yết (VND)", type: "number" },
        { path: "discount_percent", label: "Giảm giá (%)", type: "number" },
        { path: "description", label: "Mô tả chi tiết", type: "text" },
        { path: "highlights", label: "Điểm nổi bật", type: "list_string" },
        { path: "link", label: "Link", type: "string" }
      ]}
    ]
  },
  {
    id: "news",
    title: "Tin tức",
    fields: [
      { path: "news.eyebrow", label: "Eyebrow", type: "string" },
      { path: "news.title", label: "Title", type: "string" },
      { path: "news.description", label: "Description", type: "text" },
      { path: "news.posts", label: "Posts", type: "list_object", itemTitlePath: "title", fields: [
        { path: "date", label: "Date", type: "string" },
        { path: "title", label: "Title", type: "string" },
        { path: "excerpt", label: "Excerpt", type: "text" },
        { path: "image", label: "Image (URL)", type: "image" },
        { path: "link", label: "Link", type: "string" }
      ]}
    ]
  },
  {
    id: "contact",
    title: "Liên hệ",
    fields: [
      { path: "contact.eyebrow", label: "Eyebrow", type: "string" },
      { path: "contact.title", label: "Title", type: "string" },
      { path: "contact.description", label: "Description", type: "text" },
      { path: "contact.work_time", label: "Work time", type: "string" }
    ]
  }
];

