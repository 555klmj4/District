export const en = {
  // Nav
  nav_discover: "Discover",
  nav_saved: "Saved",
  nav_ai_pick: "AI Pick",
  nav_map: "Map",

  // Page titles
  page_discover: "🍜 District",
  page_saved: "🔖 Saved",
  page_recommend: "✨ AI Recommendations",
  page_map: "🗺️ Map",

  // Discover feed
  loading: "Loading…",
  restaurants_count_one: "restaurant",
  restaurants_count_other: "restaurants",
  no_restaurants_title: "No restaurants yet",
  no_restaurants_body: "Paste a Google Maps or Yelp link to get started.",

  // Filter bar
  search_placeholder: "Search restaurants, cuisines…",
  sort_newest: "Recent",
  sort_rating: "Top rated",
  sort_distance: "Nearest",
  sort_name: "Name",
  open_now: "Open now",
  cuisine_placeholder: "Cuisine (e.g. Japanese)",
  clear: "Clear",

  // Location prompt
  location_enable: "Enable location",
  location_description: "See distance to restaurants and get nearby recommendations",
  location_allow: "Allow location access",

  // Restaurant detail
  not_found: "Restaurant not found.",
  back: "Back",
  info_section: "ℹ️ Info",
  address_label: "Address",
  hours_section: "🕐 Hours",
  links_section: "🔗 Links",
  reserve_google: "Reserve via Google",
  book_openrice: "Book via OpenRice",
  search_openrice: "Search OpenRice",
  closed_today: "Closed",

  // Day labels
  day_mon: "Monday",
  day_tue: "Tuesday",
  day_wed: "Wednesday",
  day_thu: "Thursday",
  day_fri: "Friday",
  day_sat: "Saturday",
  day_sun: "Sunday",

  // Status indicator
  hours_unknown: "Hours unknown",
  open_now_label: "Open now",
  closed_label: "Closed",

  // Map launch
  open_in_maps: "Open in Maps",

  // Bookmarks
  tab_all: "All",
  tab_visited: "Visited",
  tab_wishlist: "Wishlist",
  bookmarks_empty_all: "No saved restaurants yet. Paste a link to add one.",
  bookmarks_empty_visited: "Mark restaurants as visited to see them here.",
  bookmarks_empty_wishlist: "Restaurants you haven't visited yet will appear here.",
  saved_toast: "Saved to bookmarks",
  unsaved_toast: "Removed from bookmarks",
  bookmark_error: "Failed to update bookmark",

  // Import dialog
  add_restaurant: "Add Restaurant",
  import_description: "Paste a Google Maps, OpenRice, or Yelp link to import and bookmark a restaurant.",
  import_placeholder: "https://maps.google.com/...",
  import_button: "Import",
  import_success: "Successfully imported!",
  import_supported: "Supported: Google Maps links, OpenRice pages, Yelp business pages",

  // Recommendation
  query_placeholder: 'What are you feeling? (e.g. "something cozy for tonight")',
  thinking: "Thinking…",
  suggest: "Suggest",
  open_now_only: "Open now only",
  location_active: "Location active",
  ai_insight: "AI Insight",
  ai_advisor_title: "Your personal dining advisor",
  ai_advisor_body: "Ask for a recommendation or just tap Suggest. District learns your taste from your saved restaurants.",

  // Feedback
  feedback_good: "Good pick",
  feedback_bad: "Not for me",
  feedback_good_toast: "Thanks! We'll recommend more like this.",
  feedback_bad_toast: "Got it, we'll adjust your recommendations.",
  feedback_error: "Failed to save feedback",

  // Language toggle
  lang_en: "English",
  lang_zh: "繁體中文",
} as const;

export const zhTW: Record<keyof typeof en, string> = {
  // Nav
  nav_discover: "探索",
  nav_saved: "收藏",
  nav_ai_pick: "AI 推薦",
  nav_map: "地圖",

  // Page titles
  page_discover: "🍜 District",
  page_saved: "🔖 收藏",
  page_recommend: "✨ AI 推薦",
  page_map: "🗺️ 地圖",

  // Discover feed
  loading: "載入中…",
  restaurants_count_one: "間餐廳",
  restaurants_count_other: "間餐廳",
  no_restaurants_title: "尚無餐廳",
  no_restaurants_body: "貼上 Google Maps 或 Yelp 連結以開始。",

  // Filter bar
  search_placeholder: "搜尋餐廳、料理…",
  sort_newest: "最新",
  sort_rating: "最高評分",
  sort_distance: "最近距離",
  sort_name: "名稱",
  open_now: "現在開放",
  cuisine_placeholder: "料理（例如：日本料理）",
  clear: "清除",

  // Location prompt
  location_enable: "開啟定位",
  location_description: "查看與餐廳的距離並獲取附近推薦",
  location_allow: "允許定位",

  // Restaurant detail
  not_found: "找不到餐廳。",
  back: "返回",
  info_section: "ℹ️ 資訊",
  address_label: "地址",
  hours_section: "🕐 營業時間",
  links_section: "🔗 相關連結",
  reserve_google: "透過 Google 訂位",
  book_openrice: "透過 OpenRice 訂位",
  search_openrice: "搜尋 OpenRice",
  closed_today: "休息",

  // Day labels
  day_mon: "星期一",
  day_tue: "星期二",
  day_wed: "星期三",
  day_thu: "星期四",
  day_fri: "星期五",
  day_sat: "星期六",
  day_sun: "星期日",

  // Status indicator
  hours_unknown: "未知營業時間",
  open_now_label: "現在開放",
  closed_label: "已關閉",

  // Map launch
  open_in_maps: "在地圖中開啟",

  // Bookmarks
  tab_all: "全部",
  tab_visited: "已去過",
  tab_wishlist: "心願清單",
  bookmarks_empty_all: "尚未收藏餐廳。貼上連結以新增。",
  bookmarks_empty_visited: "將餐廳標記為已去過後，即可在此查看。",
  bookmarks_empty_wishlist: "尚未去過的餐廳將顯示在此。",
  saved_toast: "已加入收藏",
  unsaved_toast: "已從收藏移除",
  bookmark_error: "更新收藏失敗",

  // Import dialog
  add_restaurant: "新增餐廳",
  import_description: "貼上 Google Maps、OpenRice 或 Yelp 連結以匯入並收藏餐廳。",
  import_placeholder: "https://maps.google.com/...",
  import_button: "匯入",
  import_success: "匯入成功！",
  import_supported: "支援：Google Maps 連結、OpenRice 頁面、Yelp 商家頁面",

  // Recommendation
  query_placeholder: "想吃什麼？（例如：今晚想吃暖胃的東西）",
  thinking: "思考中…",
  suggest: "推薦",
  open_now_only: "只看現在開放",
  location_active: "定位已開啟",
  ai_insight: "AI 分析",
  ai_advisor_title: "您的個人餐飲顧問",
  ai_advisor_body: "直接提問或點擊推薦。District 會從您收藏的餐廳學習您的口味。",

  // Feedback
  feedback_good: "喜歡",
  feedback_bad: "不合適",
  feedback_good_toast: "謝謝！我們將推薦更多類似的餐廳。",
  feedback_bad_toast: "了解，我們將調整您的推薦。",
  feedback_error: "儲存回饋失敗",

  // Language toggle
  lang_en: "English",
  lang_zh: "繁體中文",
};
