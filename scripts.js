/* scripts.js - Client-side search for portalmas
   Works for both index (highlight .card items) and koleksi (.arsip-card)
   Improvements:
   - search across multiple containers (.koleksi and .highlight-items)
   - precompute searchable text per item for speed
   - place "no results" message below the search bar
*/

document.addEventListener('DOMContentLoaded', function () {
  // Header scroll behaviour: add .scrolled to body when scrolled
  var headerEl = document.querySelector('header');
  function onScroll() {
    if (window.scrollY > 20) document.body.classList.add('scrolled'); else document.body.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Back-to-top button behavior (show after scrolling)
  (function () {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    function toggleBtn() {
      if (window.scrollY > 300) btn.classList.add('show'); else btn.classList.remove('show');
    }
    window.addEventListener('scroll', toggleBtn, { passive: true });
    toggleBtn();

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // cleanup listeners if page unloads (not strictly necessary but tidy)
    window.addEventListener('beforeunload', function () {
      window.removeEventListener('scroll', toggleBtn);
    });
  })();

  const searchInput = document.querySelector('.search-bar input');
  if (!searchInput) return; // nothing to do on pages without a search bar

  // If we're on the index (has .highlight-items but no .koleksi), redirect searches
  const hasHighlight = !!document.querySelector('.highlight-items');
  const hasKoleksi = !!document.querySelector('.koleksi');
  const isIndexLike = hasHighlight && !hasKoleksi;

  // If index-like page: redirect search queries to koleksi1.html?q=...
  if (isIndexLike) {
    // redirect on Enter or when the search button is clicked. Do NOT perform in-page filtering.
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) {
          const target = 'koleksi1.html?q=' + encodeURIComponent(q);
          window.location.href = target;
        }
      }
    });

    const btn = document.querySelector('.search-btn');
    if (btn) {
      btn.addEventListener('click', function () {
        const q = searchInput.value.trim();
        if (q) {
          window.location.href = 'koleksi1.html?q=' + encodeURIComponent(q);
        }
      });
    }

    return;
  }

  // Search suggestions: on koleksi pages, show suggestion buttons under the search bar
  (function () {
    // find the search bar container and existing tag links on the page
    const searchSection = document.querySelector('.search-bar');
    if (!searchSection) return;

    // collect unique tag names from .tag anchors in the page (use their textContent)
    const tagLinks = Array.from(document.querySelectorAll('a.tag'));
    const suggestions = [];
    tagLinks.forEach(a => {
      const text = (a.textContent || '').trim();
      if (text && !suggestions.includes(text)) suggestions.push(text);
    });

    if (suggestions.length === 0) return;

    const box = document.createElement('div');
    box.className = 'search-suggestions';
    suggestions.slice(0, 10).forEach(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'suggestion';
      btn.textContent = s;
      btn.addEventListener('click', function () {
        // set search input and trigger search behavior: on collection pages perform in-page filtering
        searchInput.value = s;
        // if page has koleksi container, run doSearch() if available
        if (typeof doSearch === 'function') {
          // trigger input event to doSearch (debounce handled)
          const ev = new Event('input', { bubbles: true });
          searchInput.dispatchEvent(ev);
        } else {
          // fallback: redirect to koleksi1.html?q=...
          window.location.href = 'koleksi1.html?q=' + encodeURIComponent(s);
        }
      });
      box.appendChild(btn);
    });

    // insert suggestions after the search bar
    searchSection.parentNode.insertBefore(box, searchSection.nextSibling);
  })();

  // collect possible containers where cards live (non-index pages)
  const containers = Array.from(document.querySelectorAll('.koleksi, .highlight-items'));
  if (containers.length === 0) return;

  // collect items from all containers
  const items = containers.flatMap(c => Array.from(c.querySelectorAll('.arsip-card, .card')));
  if (items.length === 0) return;

  // precompute searchable text to avoid repeated lowercase() calls
  items.forEach(it => {
    const text = it.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
    it.dataset.search = text;
  });

  // create or reuse "no results" message placed just after the search bar
  let noResults = document.querySelector('.no-results');
  if (!noResults) {
    noResults = document.createElement('p');
    noResults.className = 'no-results';
    noResults.textContent = 'Tidak ada hasil ditemukan.';
    noResults.style.display = 'none';
    noResults.style.color = '#555';
    noResults.style.textAlign = 'center';
    noResults.style.marginTop = '12px';

    const searchSection = searchInput.closest('.search-bar');
    if (searchSection && searchSection.parentNode) {
      searchSection.parentNode.insertBefore(noResults, searchSection.nextSibling);
    } else {
      // fallback: append to body
      document.body.appendChild(noResults);
    }
  }

  let timeoutId = null;
  function doSearch() {
    const q = searchInput.value.trim().toLowerCase();
    if (!q) {
      items.forEach(it => it.style.display = '');
      noResults.style.display = 'none';
      return;
    }

    let visible = 0;
    items.forEach(it => {
      const text = it.dataset.search || '';
      if (text.indexOf(q) !== -1) {
        it.style.display = '';
        visible++;
      } else {
        it.style.display = 'none';
      }
    });

    noResults.style.display = visible ? 'none' : '';
  }

  // debounce input for snappy UX
  searchInput.addEventListener('input', function () {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(doSearch, 150);
  });

  // allow Enter to trigger immediate search
  searchInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      clearTimeout(timeoutId);
      doSearch();
    }
  });

  // If URL contains ?q=... prefill input and run search (useful when redirected from index)
  try {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    if (qParam) {
      searchInput.value = qParam;
      // run immediately
      doSearch();
    }
  } catch (err) {
    // ignore malformed URL
  }

});
