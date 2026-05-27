const fs = require("node:fs");
const path = require("node:path");

const defaults = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "storage", "content.json"), "utf8")
);

function safeString(value, fallback = "", limit = 5000) {
  if (typeof value !== "string") {
    return fallback;
  }
  return value.trim().slice(0, limit);
}

function mergeValue(template, value) {
  if (Array.isArray(template)) {
    if (!Array.isArray(value)) {
      return structuredClone(template);
    }
    if (!template.length) {
      return value.slice(0, 50).map((item) => safeString(item, "", 250)).filter(Boolean);
    }
    return value.slice(0, 50).map((item) => mergeValue(template[0], item));
  }

  if (template && typeof template === "object") {
    const merged = {};
    for (const [key, child] of Object.entries(template)) {
      merged[key] = mergeValue(child, value && value[key]);
    }
    return merged;
  }

  return safeString(value, template);
}

function normalizeContent(content) {
  const normalized = mergeValue(defaults, content);
  normalized.home.heroMedia = safeMediaPath(normalized.home.heroMedia, defaults.home.heroMedia);
  normalized.home.heroVideo = safeMediaPath(normalized.home.heroVideo, "");
  normalized.home.featureManufacturingMedia = safeMediaPath(
    normalized.home.featureManufacturingMedia,
    defaults.home.featureManufacturingMedia
  );
  normalized.home.featureReformMedia = safeMediaPath(
    normalized.home.featureReformMedia,
    defaults.home.featureReformMedia
  );
  normalized.home.processMedia = safeMediaPath(normalized.home.processMedia, defaults.home.processMedia);
  normalized.company.logo = safeMediaPath(normalized.company.logo, defaults.company.logo);
  normalized.company.catalog = safeMediaPath(normalized.company.catalog, defaults.company.catalog);
  normalized.companyPage.heroMedia = safeMediaPath(
    normalized.companyPage.heroMedia,
    defaults.companyPage.heroMedia
  );
  normalized.solutionsPage.heroMedia = safeMediaPath(
    normalized.solutionsPage.heroMedia,
    defaults.solutionsPage.heroMedia
  );

  normalized.solutionsPage.categories.forEach((category, index) => {
    category.image = safeMediaPath(
      category.image,
      defaults.solutionsPage.categories[index]?.image || defaults.home.heroMedia
    );
  });
  normalized.servicesPage.heroMedia = safeMediaPath(
    normalized.servicesPage.heroMedia,
    defaults.servicesPage.heroMedia
  );
  normalized.servicesPage.services.forEach((service) => {
    service.slug = service.slug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-|-$)/g, "") || "servico";
    service.heroMedia = safeMediaPath(service.heroMedia, defaults.servicesPage.heroMedia);
    service.gallery.forEach((media) => {
      media.src = safeMediaPath(media.src, service.heroMedia);
      media.type = media.type === "video" ? "video" : "image";
    });
  });
  normalized.projectsPage.gallery.forEach((media) => {
    media.src = safeMediaPath(media.src, defaults.home.heroMedia);
    media.type = media.type === "video" ? "video" : "image";
  });
  normalized.clients.forEach((client) => {
    client.image = safeMediaPath(client.image, defaults.company.logo);
  });

  return normalized;
}

function safeMediaPath(value, fallback) {
  const input = safeString(value, fallback, 500);
  if (
    input.startsWith("/assets/") ||
    input.startsWith("/uploads/") ||
    input.startsWith("https://")
  ) {
    return input;
  }
  return fallback;
}

module.exports = {
  defaults: structuredClone(defaults),
  normalizeContent,
  safeString
};
