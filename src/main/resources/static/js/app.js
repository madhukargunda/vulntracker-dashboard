/* ============================================================
   Vulnerability Dashboard — Vanilla JS
   Talks to the Spring Boot REST API (no npm / no React)
   ============================================================ */

'use strict';

/* ---------- state ---------- */
let currentVersion   = null;
let allGrouped       = [];       // full list returned from API
let filteredGrouped  = [];       // after client-side search
let sortField        = 'occurrences';
let sortDir          = 'desc';   // 'asc' | 'desc'
let availableVersions = [];
let dashboardSections = ['web', 'backend', 'connectors', 'infra', 'unassigned'];

/* ============================================================
   Initialisation
   ============================================================ */
document.addEventListener('DOMContentLoaded', function () {
    loadVersions();
});

/* ============================================================
   Versions
   ============================================================ */
async function loadVersions() {
    try {
        const [versions, sections] = await Promise.all([
            apiFetch('/api/versions'),
            apiFetch('/api/dashboard/sections').catch(function () { return null; })
        ]);

        if (sections && Array.isArray(sections) && sections.length > 0) {
            dashboardSections = sections.map(normalizeSectionName);
        }

        availableVersions = versions || [];
        const select = document.getElementById('versionSelect');
        select.innerHTML = '';

        if (!versions || versions.length === 0) {
            select.innerHTML = '<option value="">No versions found</option>';
            document.getElementById('versionCount').textContent = 'No versions available';
            return;
        }

        versions.forEach(function (v) {
            const opt = document.createElement('option');
            opt.value = v;
            opt.textContent = v;
            select.appendChild(opt);
        });

        document.getElementById('versionCount').textContent =
            'Found ' + versions.length + ' version' + (versions.length !== 1 ? 's' : '');

        initComparisonSelectors(versions);
        if (versions.length > 1) {
            onCompareVersions();
        }

        // Auto-select the first (newest) version
        onVersionChange(versions[0]);
    } catch (e) {
        showError('Failed to load versions: ' + e.message);
    }
}

function initComparisonSelectors(versions) {
    const currentSelect = document.getElementById('currentVersionSelect');
    const newerSelect = document.getElementById('newerVersionSelect');

    currentSelect.innerHTML = '';
    newerSelect.innerHTML = '';

    versions.forEach(function (v) {
        const cOpt = document.createElement('option');
        cOpt.value = v;
        cOpt.textContent = v;
        currentSelect.appendChild(cOpt);

        const nOpt = document.createElement('option');
        nOpt.value = v;
        nOpt.textContent = v;
        newerSelect.appendChild(nOpt);
    });

    if (versions.length > 0) {
        newerSelect.value = versions[0];
    }
    if (versions.length > 1) {
        currentSelect.value = versions[1];
    } else if (versions.length > 0) {
        currentSelect.value = versions[0];
    }

    showSection('comparisonSection');
}

async function onCompareVersions() {
    const current = document.getElementById('currentVersionSelect').value;
    const newer = document.getElementById('newerVersionSelect').value;

    if (!current || !newer) {
        showError('Please select both current and newer versions to compare.');
        return;
    }
    if (current === newer) {
        showError('Please select two different versions for comparison.');
        return;
    }

    showLoading(true);
    hideError();
    try {
        const encodedCurrent = encodeURIComponent(current);
        const encodedNewer = encodeURIComponent(newer);
        const response = await apiFetch('/api/compare?currentVersion=' + encodedCurrent + '&newerVersion=' + encodedNewer);
        renderComparisonTable(response);
    } catch (e) {
        showError('Failed to compare versions: ' + e.message);
    } finally {
        showLoading(false);
    }
}

function renderComparisonTable(data) {
    const tbody = document.getElementById('comparisonTableBody');
    const noResults = document.getElementById('noComparisonResults');
    const currentHeader = document.getElementById('currentHeader');
    const newerHeader = document.getElementById('newerHeader');
    tbody.innerHTML = '';

    const rows = (data && data.rows) ? data.rows : [];
    document.getElementById('comparisonRowCount').textContent = rows.length;
    currentHeader.textContent = 'Current ' + (data.currentVersion || '');
    newerHeader.textContent = 'Newer ' + (data.newerVersion || '');

    if (rows.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }
    noResults.classList.add('hidden');

    rows.forEach(function (row) {
        const tr = document.createElement('tr');
        const delta = Number(row.deltaTotal || 0);
        let deltaClass = 'same';
        let deltaLabel = '0';
        if (delta > 0) {
            deltaClass = 'up';
            deltaLabel = '+' + delta;
        } else if (delta < 0) {
            deltaClass = 'down';
            deltaLabel = String(delta);
        }

        tr.innerHTML =
            '<td><div class="item-code">' + escHtml(row.imageName) + '</div></td>' +
            '<td>' + row.currentCriticalCount + '</td>' +
            '<td>' + row.currentHighCount + '</td>' +
            '<td>' + row.currentMediumCount + '</td>' +
            '<td>' + row.currentLowCount + '</td>' +
            '<td>' + row.newerCriticalCount + '</td>' +
            '<td>' + row.newerHighCount + '</td>' +
            '<td>' + row.newerMediumCount + '</td>' +
            '<td>' + row.newerLowCount + '</td>' +
            '<td><span class="delta-pill ' + deltaClass + '">' + deltaLabel + '</span></td>';

        tbody.appendChild(tr);
    });
}

/* ============================================================
   Version Change
   ============================================================ */
async function onVersionChange(version) {
    if (!version) return;
    currentVersion = version;

    // Update the select value in case we called this programmatically
    document.getElementById('versionSelect').value = version;

    showLoading(true);
    hideError();

    // Fire all three requests in parallel
    try {
        const [summaries, unique, grouped] = await Promise.all([
            apiFetch('/api/' + version + '/images/summary'),
            apiFetch('/api/' + version + '/unique-summary'),
            apiFetch('/api/' + version + '/group?by=' + getGroupBy() +
                     (getSeverity() ? '&severity=' + getSeverity() : ''))
        ]);

        renderUniqueSummary(unique);
        renderWidgets(summaries);
        storeAndRenderGrouped(grouped);

        showSection('uniqueSummarySection');
        showSection('dashboardSection');
        showSection('groupedSection');

        document.getElementById('imageCountLabel').textContent =
            summaries.length + ' image' + (summaries.length !== 1 ? 's' : '') +
            ' found for version ' + version;

    } catch (e) {
        showError('Failed to load data for version ' + version + ': ' + e.message);
    } finally {
        showLoading(false);
    }
}

/* ============================================================
   Group By / Severity filter change
   ============================================================ */
async function onGroupByChange() {
    if (!currentVersion) return;
    showLoading(true);
    try {
        const grouped = await apiFetch('/api/' + currentVersion + '/group?by=' + getGroupBy() +
            (getSeverity() ? '&severity=' + getSeverity() : ''));
        storeAndRenderGrouped(grouped);
    } catch (e) {
        showError('Failed to reload grouped data: ' + e.message);
    } finally {
        showLoading(false);
    }
    // Reset client search when filters change
    document.getElementById('searchInput').value = '';
}

/* ============================================================
   Client-side search
   ============================================================ */
function onSearch() {
    const q = document.getElementById('searchInput').value.trim().toLowerCase();
    if (!q) {
        filteredGrouped = allGrouped.slice();
    } else {
        filteredGrouped = allGrouped.filter(function (item) {
            return item.groupKey.toLowerCase().includes(q) ||
                   item.severity.toLowerCase().includes(q) ||
                   (item.impactedImages || []).some(function (img) {
                       return img.toLowerCase().includes(q);
                   });
        });
    }
    renderGroupedTable(filteredGrouped);
}

/* ============================================================
   Render: Unique Summary
   ============================================================ */
function renderUniqueSummary(data) {
    const grid = document.getElementById('uniqueSummaryGrid');
    grid.innerHTML = '';

    const cards = [
        { key: 'critical', label: 'Critical CVEs', value: data.uniqueCriticalCves },
        { key: 'high',     label: 'High CVEs',     value: data.uniqueHighCves     },
        { key: 'medium',   label: 'Medium CVEs',   value: data.uniqueMediumCves   },
        { key: 'low',      label: 'Low CVEs',      value: data.uniqueLowCves      },
        { key: 'total',    label: 'Total Unique',  value: data.totalUniqueCves    }
    ];

    cards.forEach(function (c) {
        const card = document.createElement('div');
        card.className = 'summary-card ' + c.key;
        card.innerHTML =
            '<div class="summary-card-top"></div>' +
            '<div class="summary-card-body">' +
            '  <div class="summary-card-label">' + escHtml(c.label) + '</div>' +
            '  <span class="summary-card-value">' + c.value + '</span>' +
            '</div>';
        grid.appendChild(card);
    });
}

/* ============================================================
   Render: Image Widgets
   ============================================================ */
function renderWidgets(images) {
    const container = document.getElementById('dashboardComponents');
    container.innerHTML = '';

    if (!images || images.length === 0) {
        container.innerHTML = '<p style="color:#999;padding:20px;">No images found.</p>';
        return;
    }

    const groupedBySection = groupImagesByComponent(images);
    const orderedSections = getOrderedSections(groupedBySection);

    orderedSections.forEach(function (sectionName) {
        const sectionImages = groupedBySection[sectionName] || [];

        const section = document.createElement('div');
        section.className = 'component-section';

        const header = document.createElement('div');
        header.className = 'component-section-header';
        header.innerHTML =
            '<h3 class="component-section-title">' + escHtml(formatSectionTitle(sectionName)) + '</h3>' +
            '<span class="component-count">' + sectionImages.length + ' image' + (sectionImages.length !== 1 ? 's' : '') + '</span>';
        section.appendChild(header);

        if (sectionImages.length === 0) {
            const emptyText = document.createElement('p');
            emptyText.className = 'component-empty';
            emptyText.textContent = 'No images mapped to this component.';
            section.appendChild(emptyText);
            container.appendChild(section);
            return;
        }

        const grid = document.createElement('div');
        grid.className = 'widget-grid';
        sectionImages.forEach(function (img) {
            grid.appendChild(buildWidget(img));
        });

        section.appendChild(grid);
        container.appendChild(section);
    });
}

function groupImagesByComponent(images) {
    return (images || []).reduce(function (acc, img) {
        const sectionName = normalizeSectionName(img.componentType);
        if (!acc[sectionName]) {
            acc[sectionName] = [];
        }
        acc[sectionName].push(img);
        return acc;
    }, {});
}

function getOrderedSections(groupedBySection) {
    const configured = (dashboardSections || []).map(normalizeSectionName);
    const fromData = Object.keys(groupedBySection || {}).map(normalizeSectionName);
    const ordered = [];

    configured.forEach(function (sectionName) {
        if (!ordered.includes(sectionName)) {
            ordered.push(sectionName);
        }
    });

    fromData.forEach(function (sectionName) {
        if (!ordered.includes(sectionName)) {
            ordered.push(sectionName);
        }
    });

    return ordered;
}

function normalizeSectionName(sectionName) {
    if (!sectionName || !String(sectionName).trim()) {
        return 'unassigned';
    }
    return String(sectionName).trim().toLowerCase();
}

function formatSectionTitle(sectionName) {
    return normalizeSectionName(sectionName)
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, function (char) { return char.toUpperCase(); });
}

function buildWidget(img) {
    const total = img.totalVulnerabilities || 0;
    const baseOs = (img.baseOs && String(img.baseOs).trim() && String(img.baseOs).toLowerCase() !== 'undefined')
        ? img.baseOs
        : 'Unknown';

    function pct(n) {
        return total > 0 ? ((n / total) * 100).toFixed(1) + '%' : '0%';
    }

    const baseImageName = (img.baseImageName && String(img.baseImageName).trim())
        ? String(img.baseImageName).trim()
        : null;
    const inheritedCount    = Number(img.baseImageInheritedVulnerabilityCount || 0);
    const inheritedCritical = Number(img.baseImageInheritedCriticalCount || 0);
    const inheritedHigh     = Number(img.baseImageInheritedHighCount || 0);
    const inheritedMedium   = Number(img.baseImageInheritedMediumCount || 0);
    const inheritedLow      = Number(img.baseImageInheritedLowCount || 0);
    const inheritedCves = Array.isArray(img.baseImageInheritedCveIds) ? img.baseImageInheritedCveIds : [];
    const safeImageName = escHtml(img.imageName);
    const safeBaseImageName = baseImageName ? escHtml(baseImageName) : 'Not configured';
    const cvesJson = JSON.stringify(inheritedCves).replace(/'/g, '&apos;');

    const hasBaseImage = !!baseImageName;
    const hasInherited = inheritedCount > 0;

    function inheritedBox(sev, label, count) {
        const cls = 'inherited-sev-box ' + sev + (count === 0 ? ' zero' : '');
        return '<div class="' + cls + '"><span class="inherited-sev-label">' + label + '</span><span class="inherited-sev-count">' + count + '</span></div>';
    }

    const card = document.createElement('div');
    card.className = 'image-widget';

    card.innerHTML =
        '<div class="widget-header">' +
        '  <div class="widget-image-name">' + escHtml(img.imageName) + '</div>' +
        '  <div class="widget-meta">' +
        '    <span>v' + escHtml(img.imageVersion) + '</span>' +
        '    <span>' + escHtml(baseOs) + '</span>' +
        '  </div>' +
        '</div>' +
        '<div class="widget-body">' +
        '  <div class="widget-info-row">' +
        '    <span class="widget-info-label">Total Vulnerabilities</span>' +
        '    <span class="widget-total">' + total + '</span>' +
        '  </div>' +
        '  <div class="severity-boxes">' +
        '    <div class="sev-box critical"><span class="sev-box-label">Critical</span><span class="sev-box-count">' + img.criticalCount + '</span></div>' +
        '    <div class="sev-box high"><span class="sev-box-label">High</span><span class="sev-box-count">' + img.highCount + '</span></div>' +
        '    <div class="sev-box medium"><span class="sev-box-label">Medium</span><span class="sev-box-count">' + img.mediumCount + '</span></div>' +
        '    <div class="sev-box low"><span class="sev-box-label">Low</span><span class="sev-box-count">' + img.lowCount + '</span></div>' +
        '  </div>' +
        '  <div class="sev-bar">' +
        '    <div class="sev-bar-segment critical" style="width:' + pct(img.criticalCount) + '" title="Critical: ' + img.criticalCount + '"></div>' +
        '    <div class="sev-bar-segment high"     style="width:' + pct(img.highCount)     + '" title="High: '     + img.highCount     + '"></div>' +
        '    <div class="sev-bar-segment medium"   style="width:' + pct(img.mediumCount)   + '" title="Medium: '   + img.mediumCount   + '"></div>' +
        '    <div class="sev-bar-segment low"      style="width:' + pct(img.lowCount)      + '" title="Low: '      + img.lowCount      + '"></div>' +
        '  </div>' +
        '  <div class="base-image-summary">' +
        '    <div class="widget-info-row">' +
        '      <span class="widget-info-label">Base Image</span>' +
        '      <span class="base-image-name" title="' + safeBaseImageName + '">' + safeBaseImageName + '</span>' +
        '    </div>' +
        (hasBaseImage
            ? '    <div class="inherited-section">' +
              '      <div class="inherited-section-header">' +
              '        <span class="inherited-section-title">Inherited from Base</span>' +
              (hasInherited
                  ? '        <button class="base-cves-btn" onclick=\'openBaseCvesModal("' + safeImageName + '","' + safeBaseImageName + '",' + cvesJson + ')\'>View ' + inheritedCount + ' CVEs &rsaquo;</button>'
                  : '        <span class="inherited-none-label">None</span>') +
              '      </div>' +
              '      <div class="inherited-sev-boxes">' +
              inheritedBox('critical', 'Critical', inheritedCritical) +
              inheritedBox('high',     'High',     inheritedHigh) +
              inheritedBox('medium',   'Medium',   inheritedMedium) +
              inheritedBox('low',      'Low',      inheritedLow) +
              '      </div>' +
              '    </div>'
            : '    <div class="widget-info-row"><span class="widget-info-label">Inherited CVEs</span><span class="base-image-count base-image-count-zero">N/A</span></div>') +
        '  </div>' +
        '</div>';

    return card;
}

function renderBaseImageCves(cveIds) {
    if (!cveIds || cveIds.length === 0) {
        return 'No matching CVEs from base image';
    }

    const MAX_INLINE = 5;
    if (cveIds.length <= MAX_INLINE) {
        return cveIds.join(', ');
    }

    return cveIds.slice(0, MAX_INLINE).join(', ') + ' +' + (cveIds.length - MAX_INLINE) + ' more';
}

 /* ============================================================
    Base Image CVEs Modal
    ============================================================ */
 function openBaseCvesModal(imageName, baseImageName, cveIds) {
     if (!Array.isArray(cveIds)) cveIds = [];

     document.getElementById('baseCvesModalTitle').textContent =
         'Base Image Inherited CVEs — ' + imageName;
     document.getElementById('baseCvesModalSubtitle').textContent =
         'Base image: ' + baseImageName;
     document.getElementById('baseCvesCount').textContent =
         cveIds.length + ' CVE' + (cveIds.length !== 1 ? 's' : '') + ' inherited from base image';

     const listEl = document.getElementById('baseCvesList');
     listEl.innerHTML = '';

     if (cveIds.length === 0) {
         listEl.innerHTML = '<p class="base-cves-empty">No CVEs inherited from base image.</p>';
     } else {
         const grid = document.createElement('div');
         grid.className = 'base-cves-grid';
         cveIds.slice().sort().forEach(function (cve) {
             const badge = document.createElement('span');
             badge.className = 'base-cve-badge';
             badge.textContent = cve;
             badge.title = cve;
             grid.appendChild(badge);
         });
         listEl.appendChild(grid);
     }

     document.getElementById('baseCvesModal').classList.remove('hidden');
 }

 function closeBaseCvesModal() {
     document.getElementById('baseCvesModal').classList.add('hidden');
 }

 window.addEventListener('click', function (event) {
     const baseCvesModal = document.getElementById('baseCvesModal');
     if (event.target === baseCvesModal) {
         closeBaseCvesModal();
     }
 });

/* ============================================================
   Render: Grouped Vulnerabilities Table
   ============================================================ */
function storeAndRenderGrouped(grouped) {
    allGrouped = grouped || [];
    filteredGrouped = allGrouped.slice();
    // Reset sort to default
    sortField = 'occurrences';
    sortDir   = 'desc';
    updateSortIcons();
    renderGroupedTable(filteredGrouped);
}

function renderGroupedTable(data) {
    const tbody = document.getElementById('vulnTableBody');
    const noResults = document.getElementById('noResults');
    tbody.innerHTML = '';

    document.getElementById('resultCount').textContent = data.length;

    if (!data || data.length === 0) {
        noResults.classList.remove('hidden');
        return;
    }
    noResults.classList.add('hidden');

    // Apply current sort
    const sorted = sortData(data, sortField, sortDir);

     sorted.forEach(function (item) {
         const sev = (item.severity || 'low').toLowerCase();
         const images = item.impactedImages || [];
         const MAX_SHOWN = 3;

         let imageTags = images.slice(0, MAX_SHOWN)
             .map(function (img) {
                 return '<span class="image-tag" title="' + escHtml(img) + '">' + escHtml(img) + '</span>';
             }).join('');

         if (images.length > MAX_SHOWN) {
             imageTags += '<span class="image-tag more" onclick="openImagesModal(\'' + escHtml(item.groupKey).replace(/'/g, '&apos;') + '\', ' + JSON.stringify(images).replace(/'/g, '&apos;') + ')" style="cursor: pointer;">+' + (images.length - MAX_SHOWN) + ' more</span>';
         }

         const tr = document.createElement('tr');
         tr.innerHTML =
             '<td><div class="item-code">' + escHtml(item.groupKey) + '</div></td>' +
             '<td><span class="occurrences-badge">' + item.occurrences + '</span></td>' +
             '<td><span class="score-pill ' + sev + '">' + item.maxScore.toFixed(1) + '</span></td>' +
             '<td><span class="sev-badge ' + sev + '">' + escHtml(item.severity) + '</span></td>' +
             '<td><div class="images-list">' + imageTags + '</div></td>';
         tbody.appendChild(tr);
     });
}

/* ============================================================
   Sorting
   ============================================================ */
function sortTable(field) {
    if (sortField === field) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
        sortField = field;
        sortDir   = 'desc';
    }
    updateSortIcons();
    renderGroupedTable(filteredGrouped);
}

function sortData(data, field, dir) {
    return data.slice().sort(function (a, b) {
        let va = a[field];
        let vb = b[field];

        if (typeof va === 'string') va = va.toLowerCase();
        if (typeof vb === 'string') vb = vb.toLowerCase();

        if (va < vb) return dir === 'asc' ? -1 : 1;
        if (va > vb) return dir === 'asc' ?  1 : -1;
        return 0;
    });
}

function updateSortIcons() {
    const fields = ['groupKey', 'occurrences', 'maxScore'];
    fields.forEach(function (f) {
        const el = document.getElementById('sort-' + f);
        if (!el) return;
        el.className = 'sort-icon';
        if (f === sortField) {
            el.className = 'sort-icon ' + sortDir;
        }
    });
}

/* ============================================================
   Utilities
   ============================================================ */
async function apiFetch(url) {
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error('HTTP ' + res.status + ' from ' + url);
    }
    return res.json();
}

function getGroupBy() {
    return document.getElementById('groupBySelect').value || 'cve';
}

function getSeverity() {
    return document.getElementById('severityFilter').value || '';
}

function showLoading(visible) {
    const el = document.getElementById('loadingIndicator');
    if (visible) {
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

function showSection(id) {
    document.getElementById(id).classList.remove('hidden');
}

function showError(msg) {
    const el = document.getElementById('errorBanner');
    el.textContent = '⚠️ ' + msg;
    el.classList.remove('hidden');
}

function hideError() {
    document.getElementById('errorBanner').classList.add('hidden');
}

function escHtml(str) {
     if (!str && str !== 0) return '';
     return String(str)
         .replace(/&/g, '&amp;')
         .replace(/</g, '&lt;')
         .replace(/>/g, '&gt;')
         .replace(/"/g, '&quot;');
 }

 /* ============================================================
    Modal for Impacted Images
    ============================================================ */
 function openImagesModal(groupKey, images) {
     if (!Array.isArray(images)) {
         images = [];
     }

     document.getElementById('modalTitle').textContent = 'Impacted Images for: ' + escHtml(groupKey);

     const imagesList = document.getElementById('modalImagesList');
     imagesList.innerHTML = '';

     if (images.length === 0) {
         imagesList.innerHTML = '<p style="color: #999;">No images found.</p>';
     } else {
         const ul = document.createElement('ul');
         ul.className = 'images-modal-list';

         images.forEach(function (img) {
             const li = document.createElement('li');
             li.className = 'images-modal-item';
             li.textContent = img;
             ul.appendChild(li);
         });

         imagesList.appendChild(ul);
     }

     const modal = document.getElementById('imagesModal');
     modal.classList.remove('hidden');
 }

 function closeImagesModal() {
     const modal = document.getElementById('imagesModal');
     modal.classList.add('hidden');
 }

 // Close modal when clicking outside of it
 window.addEventListener('click', function (event) {
     const modal = document.getElementById('imagesModal');
     if (event.target === modal) {
         closeImagesModal();
     }
 });
