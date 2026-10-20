export const en = {
  // Nav
  nav_discover: "Discover",
  nav_ai_pick: "AI Pick",
  nav_map: "Map",

  // App title
  app_title: "District",

  // Offline
  offline_title: "You're offline",

  // Discover feed
  loading: "Loading…",
  restaurants_count_one: "restaurant",
  restaurants_count_other: "restaurants",
  no_restaurants_title: "No restaurants yet",
  no_restaurants_body: "Paste a Google Maps or OpenRice link to get started.",
  list_load_error_title: "Something went wrong",
  list_load_error_body: "Couldn't load this. Check your connection and try again.",
  retry: "Retry",

  // Filter bar
  filters_show: "Show filters",
  filter_no_color: "No colour",
  search_placeholder: "Search restaurants, cuisines…",
  search_title: "Search",
  search_no_results: "No matches found",
  search_error: "Search failed — try again",
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
  load_error: "Something went wrong loading this restaurant.",
  back: "Back",
  added_via: "Added via",
  info_section: "Info",
  address_label: "Address",
  price_label: "Price",
  hours_section: "Hours",
  links_section: "Links",
  reserve_google: "Reserve via Google",
  book_openrice: "Book via OpenRice",
  search_openrice: "Search OpenRice",
  closed_today: "Closed",
  share_maps_link: "Share Maps link",
  share_openrice_link: "Share OpenRice link",
  link_copied: "Copied!",

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

  // Import dialog
  add_restaurant: "Add Restaurant",
  import_description: "Paste a Google Maps or OpenRice link to import a restaurant.",
  import_placeholder: "https://maps.google.com/...",
  import_button: "Import",
  import_success: "Successfully imported!",
  import_supported: "Supported: Google Maps links, OpenRice pages",
  import_tab_link: "Paste a link",
  import_tab_search: "Search by name",
  import_search_description: "Search for a restaurant by name to import it.",
  import_search_placeholder: "Restaurant name…",
  import_search_no_results: "No matches found",
  import_search_error: "Search failed — try again",
  branches_title: "Other branches of",
  branches_checking: "Checking for other branches…",
  branches_select_all: "Select all",
  branches_add: "Add selected",
  branches_skip: "Skip",
  branches_added: "Added branches:",
  branches_already_saved: "already saved",
  branches_saved_label: "Saved",
  branches_failed: "failed",
  branches_region_other: "Other",
  branches_find: "Find other branches",
  branches_none: "No other branches found",
  branches_error: "Couldn't look up branches — try again",

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

  // Signature dishes
  known_for: "Known for",

  // Delete
  delete_restaurant: "Delete Restaurant",
  delete_confirm: "This will permanently remove the restaurant and all its data.",
  delete_confirm_button: "Yes, delete",
  delete_cancel: "Cancel",
  delete_success: "Restaurant deleted",
  delete_error: "Failed to delete restaurant",

  // Logout
  logout_title: "Log out?",
  logout_confirm: "You'll need your passphrase to sign back in.",
  logout_confirm_button: "Log out",
  logout_error: "Failed to log out",
  undo: "Undo",

  // History
  nav_history: "History",
  history_title: "History",
  history_empty_title: "No activity yet",
  history_empty_body: "Changes you make will show up here.",
  history_verb_added: "Added",
  history_verb_removed: "Removed",
  history_verb_color_added: "Added color tag to",
  history_verb_color_removed: "Removed color tag from",
  history_verb_starred: "Pinned",
  history_verb_unstarred: "Unpinned",
  history_load_more: "Load more",

  // Pinned (stored as "stars")
  starred_section_title: "Pinned",
  star_restaurant: "Pin restaurant",
  unstar_restaurant: "Unpin restaurant",
  star_added_toast: "Pinned",
  star_removed_toast: "Unpinned",
} as const;

export const zhTW: Record<keyof typeof en, string> = {
  // Nav
  nav_discover: "探索",
  nav_ai_pick: "AI 推薦",
  nav_map: "地圖",

  // App title
  app_title: "District",

  // Offline
  offline_title: "您已離線",

  // Discover feed
  loading: "載入中…",
  restaurants_count_one: "間餐廳",
  restaurants_count_other: "間餐廳",
  no_restaurants_title: "尚無餐廳",
  no_restaurants_body: "貼上 Google Maps 或 OpenRice 連結以開始。",
  list_load_error_title: "發生錯誤",
  list_load_error_body: "無法載入，請檢查網路連線後重試。",
  retry: "重試",

  // Filter bar
  filters_show: "顯示篩選",
  filter_no_color: "無顏色",
  search_placeholder: "搜尋餐廳、料理…",
  search_title: "搜尋",
  search_no_results: "找不到相符結果",
  search_error: "搜尋失敗，請重試",
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
  load_error: "載入餐廳時發生錯誤。",
  back: "返回",
  added_via: "透過",
  info_section: "資訊",
  address_label: "地址",
  price_label: "價格",
  hours_section: "開放時間",
  links_section: "相關連結",
  reserve_google: "透過 Google 訂位",
  book_openrice: "透過 OpenRice 訂位",
  search_openrice: "搜尋 OpenRice",
  closed_today: "休息",
  share_maps_link: "分享 Maps 連結",
  share_openrice_link: "分享 OpenRice 連結",
  link_copied: "已複製！",

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

  // Import dialog
  add_restaurant: "新增餐廳",
  import_description: "貼上 Google Maps 或 OpenRice 連結以匯入餐廳。",
  import_placeholder: "https://maps.google.com/...",
  import_button: "匯入",
  import_success: "匯入成功！",
  import_supported: "支援：Google Maps 連結、OpenRice 頁面",
  import_tab_link: "貼上連結",
  import_tab_search: "搜尋名稱",
  import_search_description: "搜尋餐廳名稱以匯入。",
  import_search_placeholder: "餐廳名稱…",
  import_search_no_results: "找不到相符結果",
  import_search_error: "搜尋失敗，請重試",
  branches_title: "其他分店：",
  branches_checking: "正在搜尋其他分店…",
  branches_select_all: "全選",
  branches_add: "加入所選",
  branches_skip: "略過",
  branches_added: "已加入分店：",
  branches_already_saved: "已儲存",
  branches_saved_label: "已儲存",
  branches_failed: "失敗",
  branches_region_other: "其他",
  branches_find: "搜尋其他分店",
  branches_none: "找不到其他分店",
  branches_error: "無法搜尋分店，請重試",

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

  // Signature dishes
  known_for: "招牌菜",

  // Delete
  delete_restaurant: "刪除餐廳",
  delete_confirm: "此操作將永久移除餐廳及所有相關資料。",
  delete_confirm_button: "確認刪除",
  delete_cancel: "取消",
  delete_success: "餐廳已刪除",
  delete_error: "刪除失敗",

  // Logout
  logout_title: "登出？",
  logout_confirm: "重新登入時需要您的通關密語。",
  logout_confirm_button: "登出",
  logout_error: "登出失敗",
  undo: "復原",

  // History
  nav_history: "紀錄",
  history_title: "變更紀錄",
  history_empty_title: "尚無紀錄",
  history_empty_body: "您所做的變更將會顯示於此。",
  history_verb_added: "新增了",
  history_verb_removed: "刪除了",
  history_verb_color_added: "新增顏色標籤於",
  history_verb_color_removed: "移除顏色標籤於",
  history_verb_starred: "釘選了",
  history_verb_unstarred: "取消釘選了",
  history_load_more: "載入更多",

  // Pinned (stored as "stars")
  starred_section_title: "已釘選",
  star_restaurant: "釘選",
  unstar_restaurant: "取消釘選",
  star_added_toast: "已釘選",
  star_removed_toast: "已取消釘選",
};
