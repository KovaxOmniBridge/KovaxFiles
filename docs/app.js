document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide Icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Mobile Menu Toggle Logic
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');

  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    // Close mobile menu when clicking a link
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // FAQ Accordion Logic
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    item.addEventListener('click', () => {
      const paragraph = item.querySelector('p');
      const icon = item.querySelector('[data-lucide="chevron-down"]');

      const isHidden = paragraph.classList.contains('hidden');

      // Close all other open items
      faqItems.forEach(other => {
        other.querySelector('p')?.classList.add('hidden');
        other.querySelector('[data-lucide="chevron-down"]')?.classList.remove('rotate-180');
      });

      if (isHidden) {
        paragraph.classList.remove('hidden');
        icon?.classList.add('rotate-180');
      }
    });
  });

  // Dynamic GitHub Release Version Fetcher (Safely handled)
  async function fetchLatestRelease() {
    try {
      const response = await fetch('https://api.github.com/repos/KovaxOmniBridge/KovaxFiles/releases/latest');
      if (response.ok) {
        const data = await response.json();
        const tag = data.tag_name || 'v1.0.0';
        
        // Update version badges if available
        document.querySelectorAll('.release-tag').forEach(el => {
          el.textContent = tag;
        });
      }
    } catch (err) {
      // Graceful silent fallback to default v1.0.0
    }
  }

  fetchLatestRelease();
});
