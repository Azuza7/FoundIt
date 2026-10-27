 
"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const STORAGE_KEY = "foundit_listings_v2";

    let listings = loadListings();
    let currentFilter = "all";
    let toastTimer;

    const reportOverlay = document.getElementById("reportOverlay");
    const detailsOverlay = document.getElementById("detailsOverlay");
    const reportForm = document.getElementById("reportForm");
    const listingsContainer = document.getElementById("listings");
    const emptyMessage = document.getElementById("emptyMessage");
    const searchInput = document.getElementById("searchInput");
    const sortSelect = document.getElementById("sortSelect");
    const toast = document.getElementById("toast");

    function loadListings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : [];

            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function saveListings() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
    }

    function escapeHTML(value) {
        return String(value ?? "").replace(/[&<>"']/g, function (character) {
            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return replacements[character];
        });
    }

    function showToast(message) {
        toast.textContent = message;
        toast.style.display = "block";

        clearTimeout(toastTimer);

        toastTimer = setTimeout(function () {
            toast.style.display = "none";
        }, 3000);
    }

    function openModal(modal) {
        modal.hidden = false;
        document.body.style.overflow = "hidden";

        const firstInput = modal.querySelector("input, select, textarea");
        if (firstInput) firstInput.focus();
    }

    function closeModal(modal) {
        modal.hidden = true;

        if (reportOverlay.hidden && detailsOverlay.hidden) {
            document.body.style.overflow = "";
        }
    }

    function saveAndRender(successMessage) {
        try {
            saveListings();
            renderListings();

            if (successMessage) showToast(successMessage);
            return true;
        } catch (error) {
            showToast("Unable to save changes in this browser.");
            return false;
        }
    }

    // Open the report form.
    document.getElementById("openReport").addEventListener("click", function () {
        openModal(reportOverlay);
    });

    document.getElementById("heroReport").addEventListener("click", function () {
        openModal(reportOverlay);
    });

    // Close the report form.
    document.getElementById("closeReport").addEventListener("click", function () {
        closeModal(reportOverlay);
    });

    // Close item details.
    document.getElementById("closeDetails").addEventListener("click", function () {
        closeModal(detailsOverlay);
    });

    // Close a modal when the background is clicked.
    [reportOverlay, detailsOverlay].forEach(function (overlay) {
        overlay.addEventListener("click", function (event) {
            if (event.target === overlay) {
                closeModal(overlay);
            }
        });
    });

    // Close modals using the Escape key.
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            if (!reportOverlay.hidden) closeModal(reportOverlay);
            if (!detailsOverlay.hidden) closeModal(detailsOverlay);
        }
    });

    // Submit a new lost or found item.
    reportForm.addEventListener("submit", function (event) {
        event.preventDefault();

        const formData = new FormData(reportForm);

        const item = {
            id: (Date.now().toString() + Math.random().toString(36).slice(2)),
            type: formData.get("type"),
            name: formData.get("name").trim(),
            description: formData.get("description").trim(),
            location: formData.get("location").trim(),
            date: formData.get("date"),
            contact: formData.get("contact").trim(),
            createdAt: new Date().toISOString(),
            recovered: false
        };

        if (
            !item.name ||
            !item.description ||
            !item.location ||
            !item.date ||
            !item.contact
        ) {
            showToast("Please complete all fields.");
            return;
        }

        listings.unshift(item);

        try {
            saveListings();
        } catch (error) {
            listings.shift();
            showToast("Could not save your report. Check browser storage.");
            return;
        }

        reportForm.reset();
        closeModal(reportOverlay);
        renderListings();
        showToast("Your report has been submitted.");
    });

    // Filter the listings.
    document.querySelectorAll(".filter-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            currentFilter = button.dataset.filter;

            document.querySelectorAll(".filter-btn").forEach(function (filterButton) {
                filterButton.classList.toggle(
                    "active",
                    filterButton === button
                );
            });

            renderListings();
        });
    });

    // Search and sorting.
    searchInput.addEventListener("input", renderListings);
    sortSelect.addEventListener("change", renderListings);

    function renderListings() {
        const searchTerm = searchInput.value.trim().toLowerCase();
        const sortOrder = sortSelect.value;

        const filteredListings = listings.filter(function (item) {
            const matchesFilter =
                currentFilter === "all" || item.type === currentFilter;

            const searchableText = [
                item.name,
                item.description,
                item.location
            ].join(" ").toLowerCase();

            return matchesFilter && searchableText.includes(searchTerm);
        });

        filteredListings.sort(function (a, b) {
            const dateA = new Date(a.createdAt).getTime() || 0;
            const dateB = new Date(b.createdAt).getTime() || 0;

            return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
        });

        listingsContainer.replaceChildren();
        emptyMessage.style.display =
            filteredListings.length === 0 ? "block" : "none";

        filteredListings.forEach(function (item) {
            const card = document.createElement("article");
            card.className = "item-card";

            const status = item.recovered ? "Recovered" : item.type;

            card.innerHTML = `
                <span class="item-status">${escapeHTML(status)}</span>
                <h3>${escapeHTML(item.name)}</h3>
                <p>${escapeHTML(item.description)}</p>
                <p><strong>Location:</strong> ${escapeHTML(item.location)}</p>
                <p><strong>Date:</strong> ${escapeHTML(item.date)}</p>

                <div class="card-actions">
                    <button type="button" class="small-btn"
                        data-action="details" data-id="${escapeHTML(item.id)}">
                        View Details
                    </button>

                    ${item.recovered ? "" : `
                        <button type="button" class="small-btn"
                            data-action="recover" data-id="${escapeHTML(item.id)}">
                            Mark Recovered
                        </button>
                    `}

                    <button type="button" class="small-btn"
                        data-action="delete" data-id="${escapeHTML(item.id)}">
                        Delete
                    </button>
                </div>
            `;

            listingsContainer.appendChild(card);
        });
    }

    // Handle buttons inside item cards.
    listingsContainer.addEventListener("click", function (event) {
        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const itemId = button.dataset.id;
        const action = button.dataset.action;

        const item = listings.find(function (entry) {
            return entry.id === itemId;
        });

        if (!item) return;

        // Show item details.
        if (action === "details") {
            document.getElementById("itemDetails").innerHTML = `
                <p><strong>Type:</strong> ${escapeHTML(item.type)}</p>
                <p><strong>Item:</strong> ${escapeHTML(item.name)}</p>
                <p><strong>Description:</strong> ${escapeHTML(item.description)}</p>
                <p><strong>Location:</strong> ${escapeHTML(item.location)}</p>
                <p><strong>Date:</strong> ${escapeHTML(item.date)}</p>
                <p><strong>Contact:</strong> ${escapeHTML(item.contact)}</p>
                <p><strong>Status:</strong> ${item.recovered ? "Recovered" : "Active"}</p>
            `;

            openModal(detailsOverlay);
            return;
        }

        // Mark an item as recovered.
        if (action === "recover") {
            const previousValue = item.recovered;
            item.recovered = true;

            if (!saveAndRender("Item marked as recovered.")) {
                item.recovered = previousValue;
                renderListings();
            }

            return;
        }

        // Delete an item.
        if (action === "delete") {
            const confirmed = window.confirm(
                "Are you sure you want to delete this report?"
            );

            if (!confirmed) return;

            const previousListings = listings;
            listings = listings.filter(function (entry) {
                return entry.id !== itemId;
            });

            if (!saveAndRender("Report deleted.")) {
                listings = previousListings;
                renderListings();
            }
        }
    });

    // Display saved reports when the page opens.
    renderListings();
});
