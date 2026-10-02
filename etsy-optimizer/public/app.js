const TITLE_LIMIT = 70;

const dropzone = document.getElementById('dropzone');
const photoInput = document.getElementById('photoInput');
const dropzoneEmpty = document.getElementById('dropzoneEmpty');
const preview = document.getElementById('preview');

const generateBtn = document.getElementById('generateBtn');
const errorBox = document.getElementById('errorBox');

const loading = document.getElementById('loading');
const results = document.getElementById('results');
const emptyState = document.getElementById('emptyState');

const titleValue = document.getElementById('titleValue');
const titleCount = document.getElementById('titleCount');
const tagsValue = document.getElementById('tagsValue');
const descriptionValue = document.getElementById('descriptionValue');
const shippingWarning = document.getElementById('shippingWarning');

let imageDataUrl = null;

// --- Photo upload (click + drag-and-drop) ---

dropzone.addEventListener('click', () => photoInput.click());

photoInput.addEventListener('change', () => {
  const file = photoInput.files && photoInput.files[0];
  if (file) loadImageFile(file);
});

['dragenter', 'dragover'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
});

['dragleave', 'drop'].forEach((evt) => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
  });
});

dropzone.addEventListener('drop', (e) => {
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) loadImageFile(file);
});

function loadImageFile(file) {
  if (!file.type.startsWith('image/')) {
    showError('Please upload an image file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    imageDataUrl = reader.result;
    preview.src = imageDataUrl;
    preview.hidden = false;
    dropzoneEmpty.hidden = true;
    clearError();
  };
  reader.readAsDataURL(file);
}

// --- Generate listing ---

generateBtn.addEventListener('click', generateListing);

async function generateListing() {
  clearError();

  if (!imageDataUrl) {
    showError('Please upload a product photo first.');
    return;
  }

  const payload = {
    image: imageDataUrl,
    material: document.getElementById('material').value.trim(),
    listingType: document.getElementById('listingType').value,
    occasion: document.getElementById('occasion').value.trim(),
    pricePoint: document.getElementById('pricePoint').value,
    shippingCost: document.getElementById('shippingCost').value,
  };

  setLoading(true);

  try {
    const res = await fetch('/api/generate-listing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      showError(data.error || 'Something went wrong generating the listing.', Boolean(data.retryable));
      hideResults();
      return;
    }

    renderResults(data);
  } catch (err) {
    showError('Could not reach the server. Check your connection and try again.', true);
    hideResults();
  } finally {
    setLoading(false);
  }
}

function setLoading(isLoading) {
  loading.hidden = !isLoading;
  generateBtn.disabled = isLoading;
  if (isLoading) {
    results.hidden = true;
    emptyState.hidden = true;
  }
}

function hideResults() {
  results.hidden = true;
  emptyState.hidden = false;
}

function renderResults(listing) {
  emptyState.hidden = true;
  results.hidden = false;

  titleValue.textContent = listing.title;
  const len = listing.title.length;
  titleCount.textContent = `${len} / ${TITLE_LIMIT} chars`;
  titleCount.classList.toggle('over-limit', len > TITLE_LIMIT);

  tagsValue.innerHTML = '';
  listing.tags.forEach((tag) => {
    const li = document.createElement('li');
    li.textContent = tag;
    tagsValue.appendChild(li);
  });

  descriptionValue.textContent = listing.description;

  if (listing.shipping_flag && listing.shipping_flag.triggered) {
    shippingWarning.hidden = false;
    shippingWarning.textContent = `⚠️ Shipping warning: ${listing.shipping_flag.note || 'Shipping cost may be too high for US domestic listings.'}`;
  } else {
    shippingWarning.hidden = true;
    shippingWarning.textContent = '';
  }
}

// --- Copy buttons ---

document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const targetId = btn.getAttribute('data-copy-target');
    const target = document.getElementById(targetId);
    const text = target.tagName === 'UL'
      ? Array.from(target.querySelectorAll('li')).map((li) => li.textContent).join(', ')
      : target.textContent;

    try {
      await navigator.clipboard.writeText(text);
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 1500);
    } catch (err) {
      showError('Could not copy to clipboard.');
    }
  });
});

// --- Error handling ---

function showError(message, retryable) {
  errorBox.hidden = false;
  errorBox.innerHTML = '';

  const text = document.createElement('span');
  text.textContent = message;
  errorBox.appendChild(text);

  if (retryable) {
    const retryBtn = document.createElement('button');
    retryBtn.textContent = 'Retry';
    retryBtn.className = 'copy-btn';
    retryBtn.style.marginLeft = '10px';
    retryBtn.addEventListener('click', generateListing);
    errorBox.appendChild(retryBtn);
  }
}

function clearError() {
  errorBox.hidden = true;
  errorBox.innerHTML = '';
}
