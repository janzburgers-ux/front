export const trackPageView = (path) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag('config', 'G-3KZ6Y42ZHJ', {
      page_path: path,
      page_title: document.title,
    });
  }
};