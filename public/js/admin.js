(function () {
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  const status = document.querySelector("#save-status");
  const initial = document.querySelector("#initial-content").textContent;
  let content = JSON.parse(initial);
  let dirty = false;

  function read(path) {
    return path.split(".").reduce((object, key) => object[key], content);
  }

  function write(path, value) {
    const parts = path.split(".");
    const key = parts.pop();
    const object = parts.reduce((current, part) => current[part], content);
    object[key] = value;
    setDirty();
  }

  function safe(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function setDirty() {
    dirty = true;
    status.textContent = "Alterações não salvas";
    status.className = "status dirty";
  }

  function setSaved() {
    dirty = false;
    status.textContent = "Site salvo";
    status.className = "status done";
  }

  function bindFields() {
    document.querySelectorAll("[data-field]").forEach((field) => {
      field.value = read(field.dataset.field) || "";
      field.addEventListener("input", () => write(field.dataset.field, field.value));
    });
  }

  function renderNumbers() {
    document.querySelector("#numbers-editor").innerHTML = content.home.numbers
      .map(
        (item, index) => `
          <article class="inline-editor number-editor">
            <label>Valor<input data-edit="home.numbers.${index}.value" value="${safe(item.value)}"></label>
            <label>Rótulo<input data-edit="home.numbers.${index}.label" value="${safe(item.label)}"></label>
            <button class="remove" data-remove="numbers" data-index="${index}" type="button">Excluir</button>
          </article>
        `
      )
      .join("");
  }

  function renderTextList(target, items, path, type, label) {
    document.querySelector(target).innerHTML = items
      .map(
        (item, index) => `
          <article class="inline-editor single-editor">
            <label>${label}<input data-edit="${path}.${index}" value="${safe(item)}"></label>
            <button class="remove" data-remove="${type}" data-index="${index}" type="button">Excluir</button>
          </article>
        `
      )
      .join("");
  }

  function renderStatements() {
    renderTextList("#statements-editor", content.home.statements, "home.statements", "statements", "Atuação");
  }

  function renderValues() {
    renderTextList("#values-editor", content.companyPage.values, "companyPage.values", "values", "Valor");
  }

  function renderDifferentials() {
    renderTextList(
      "#differentials-editor",
      content.servicesPage.differentials,
      "servicesPage.differentials",
      "differentials",
      "Diferencial"
    );
  }

  function renderMarkets() {
    renderTextList("#markets-editor", content.markets, "markets", "markets", "Setor");
  }

  function renderTimeline() {
    document.querySelector("#timeline-editor").innerHTML = content.companyPage.timeline
      .map(
        (item, index) => `
          <article class="inline-editor timeline-editor">
            <label>Ano<input data-edit="companyPage.timeline.${index}.year" value="${safe(item.year)}"></label>
            <label>Título<input data-edit="companyPage.timeline.${index}.title" value="${safe(item.title)}"></label>
            <label>Descrição<textarea data-edit="companyPage.timeline.${index}.text" rows="2">${safe(item.text)}</textarea></label>
            <button class="remove" data-remove="timeline" data-index="${index}" type="button">Excluir</button>
          </article>
        `
      )
      .join("");
  }

  function renderCategories() {
    document.querySelector("#categories-editor").innerHTML = content.solutionsPage.categories
      .map(
        (item, index) => `
          <article class="inline-editor category-editor">
            <label>Título<input data-edit="solutionsPage.categories.${index}.title" value="${safe(item.title)}"></label>
            <label>Imagem<input data-edit="solutionsPage.categories.${index}.image" value="${safe(item.image)}"></label>
            <label class="wide">Descrição<textarea data-edit="solutionsPage.categories.${index}.text" rows="2">${safe(item.text)}</textarea></label>
            <label class="wide">Equipamentos (um por linha)<textarea data-lines="solutionsPage.categories.${index}.items" rows="4">${safe(item.items.join("\n"))}</textarea></label>
            <div>
              <label class="upload">Enviar foto<input data-upload="solutionsPage.categories.${index}.image" type="file" accept="image/*"></label>
              <button class="remove" data-remove="category" data-index="${index}" type="button">Excluir</button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderServices() {
    document.querySelector("#services-editor").innerHTML = content.servicesPage.services
      .map(
        (item, index) => `
          <article class="service-admin">
            <div class="inline-editor category-editor">
              <label>Serviço<input data-edit="servicesPage.services.${index}.title" value="${safe(item.title)}"></label>
              <label>Endereço da página<input data-edit="servicesPage.services.${index}.slug" value="${safe(item.slug)}"></label>
              <label class="wide">Resumo da listagem<textarea data-edit="servicesPage.services.${index}.text" rows="2">${safe(item.text)}</textarea></label>
              <label class="wide">Texto da página<textarea data-edit="servicesPage.services.${index}.description" rows="3">${safe(item.description)}</textarea></label>
              <label class="wide">Etapas de execução (uma por linha)<textarea data-lines="servicesPage.services.${index}.phases" rows="3">${safe(item.phases.join("\n"))}</textarea></label>
              <label class="wide">Escopo e entregas (uma por linha)<textarea data-lines="servicesPage.services.${index}.deliverables" rows="3">${safe(item.deliverables.join("\n"))}</textarea></label>
              <div class="service-cover-admin">
                <img src="${safe(item.heroMedia)}" alt="">
                <label class="upload">Trocar capa<input data-upload="servicesPage.services.${index}.heroMedia" type="file" accept="image/*"></label>
              </div>
              <button class="remove" data-remove="service" data-index="${index}" type="button">Excluir serviço</button>
            </div>
            <div class="service-gallery-admin">
              <div class="repeater-head"><h3>Fotos e vídeos desta página</h3><button data-add-service-media="${index}" type="button">Adicionar mídia</button></div>
              <div class="service-media-editors">
                ${item.gallery.map((media, mediaIndex) => `
                  <article class="service-media-admin">
                    ${media.type === "video" ? `<video src="${safe(media.src)}" muted controls></video>` : `<img src="${safe(media.src)}" alt="">`}
                    <label>Legenda<input data-edit="servicesPage.services.${index}.gallery.${mediaIndex}.title" value="${safe(media.title)}"></label>
                    <label class="upload">Enviar foto/vídeo<input data-service-upload="${index}.${mediaIndex}" type="file" accept="image/*,video/*"></label>
                    <button class="remove" data-remove-service-media="${index}.${mediaIndex}" type="button">Excluir mídia</button>
                  </article>
                `).join("")}
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderGallery() {
    document.querySelector("#gallery-editor").innerHTML = content.projectsPage.gallery
      .map((item, index) => {
        const visual =
          item.type === "video"
            ? `<video src="${safe(item.src)}" muted controls></video>`
            : `<img src="${safe(item.src)}" alt="">`;
        return `
          <article class="media-card">
            ${visual}
            <div class="media-fields inline-editor">
              <label>Título<input data-edit="projectsPage.gallery.${index}.title" value="${safe(item.title)}"></label>
              <label>Categoria<input data-edit="projectsPage.gallery.${index}.tag" value="${safe(item.tag)}"></label>
            </div>
            <div class="media-actions">
              <label class="upload">Trocar mídia<input data-gallery-upload="${index}" type="file" accept="image/*,video/*"></label>
              <button class="remove" data-remove="gallery" data-index="${index}" type="button">Excluir</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderClients() {
    document.querySelector("#clients-editor").innerHTML = content.clients
      .map(
        (client, index) => `
          <article class="client-editor">
            <img src="${safe(client.image)}" alt="">
            <label>Cliente<input data-edit="clients.${index}.name" value="${safe(client.name)}"></label>
            <label class="upload">Trocar marca<input data-upload="clients.${index}.image" type="file" accept="image/*"></label>
            <button class="remove" data-remove="client" data-index="${index}" type="button">Excluir</button>
          </article>
        `
      )
      .join("");
  }

  function renderAll() {
    renderStatements();
    renderNumbers();
    renderValues();
    renderTimeline();
    renderCategories();
    renderServices();
    renderDifferentials();
    renderGallery();
    renderMarkets();
    renderClients();
    document.querySelector("#home-media-preview").src = content.home.heroMedia;
    document.querySelector("#manufacturing-media-preview").src = content.home.featureManufacturingMedia;
    document.querySelector("#reform-media-preview").src = content.home.featureReformMedia;
    document.querySelector("#process-media-preview").src = content.home.processMedia;
    document.querySelector("#company-media-preview").src = content.companyPage.heroMedia;
    document.querySelector("#solutions-media-preview").src = content.solutionsPage.heroMedia;
    document.querySelector("#service-media-preview").src = content.servicesPage.heroMedia;
    document.querySelector("#logo-media-preview").src = content.company.logo;
  }

  function handleDynamicInput(event) {
    const input = event.target.closest("[data-edit]");
    const lines = event.target.closest("[data-lines]");
    if (input) write(input.dataset.edit, input.value);
    if (lines) write(lines.dataset.lines, lines.value.split("\n").map((line) => line.trim()).filter(Boolean));
  }

  async function sendUpload(file) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch("/admin/api/upload", {
      method: "POST",
      headers: { "x-csrf-token": csrf },
      body
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Não foi possível enviar o arquivo.");
    }
    return result.media;
  }

  document.addEventListener("input", handleDynamicInput);

  document.addEventListener("change", async (event) => {
    const direct = event.target.closest("[data-upload]");
    const gallery = event.target.closest("[data-gallery-upload]");
    const serviceMedia = event.target.closest("[data-service-upload]");
    try {
      if (direct && direct.files[0]) {
        const media = await sendUpload(direct.files[0]);
        write(direct.dataset.upload, media.path);
        renderAll();
      }
      if (gallery && gallery.files[0]) {
        const media = await sendUpload(gallery.files[0]);
        const item = content.projectsPage.gallery[Number(gallery.dataset.galleryUpload)];
        item.src = media.path;
        item.type = media.mimeType.startsWith("video/") ? "video" : "image";
        setDirty();
        renderGallery();
      }
      if (serviceMedia && serviceMedia.files[0]) {
        const media = await sendUpload(serviceMedia.files[0]);
        const [serviceIndex, mediaIndex] = serviceMedia.dataset.serviceUpload.split(".").map(Number);
        const item = content.servicesPage.services[serviceIndex].gallery[mediaIndex];
        item.src = media.path;
        item.type = media.mimeType.startsWith("video/") ? "video" : "image";
        setDirty();
        renderServices();
      }
    } catch (error) {
      window.alert(error.message);
    }
  });

  document.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add]");
    const remove = event.target.closest("[data-remove]");
    const clear = event.target.closest("[data-clear]");
    const addServiceMedia = event.target.closest("[data-add-service-media]");
    const removeServiceMedia = event.target.closest("[data-remove-service-media]");

    if (addServiceMedia) {
      const serviceIndex = Number(addServiceMedia.dataset.addServiceMedia);
      content.servicesPage.services[serviceIndex].gallery.push({
        type: "image",
        title: "Novo registro do serviço",
        src: content.servicesPage.services[serviceIndex].heroMedia
      });
      setDirty();
      renderServices();
    }

    if (removeServiceMedia) {
      const [serviceIndex, mediaIndex] = removeServiceMedia.dataset.removeServiceMedia.split(".").map(Number);
      content.servicesPage.services[serviceIndex].gallery.splice(mediaIndex, 1);
      setDirty();
      renderServices();
    }

    if (add) {
      if (add.dataset.add === "statements") {
        content.home.statements.push("Nova linha de atuação");
        renderStatements();
      }
      if (add.dataset.add === "numbers") {
        content.home.numbers.push({ value: "Novo", label: "indicador" });
        renderNumbers();
      }
      if (add.dataset.add === "timeline") {
        content.companyPage.timeline.push({ year: "2026", title: "Novo marco", text: "Descrição do marco." });
        renderTimeline();
      }
      if (add.dataset.add === "values") {
        content.companyPage.values.push("Novo valor");
        renderValues();
      }
      if (add.dataset.add === "category") {
        content.solutionsPage.categories.push({
          id: `nova-${Date.now()}`,
          title: "Nova categoria",
          text: "Descrição da categoria.",
          items: ["Equipamento"],
          image: "/assets/premium/fabricacao.jpg"
        });
        renderCategories();
      }
      if (add.dataset.add === "service") {
        content.servicesPage.services.push({
          slug: `novo-servico-${Date.now()}`,
          title: "Novo serviço",
          text: "Descrição resumida do serviço.",
          description: "Descrição completa desta página de serviço.",
          heroMedia: "/assets/premium/reforma.jpg",
          phases: ["Diagnóstico", "Execução", "Entrega"],
          deliverables: ["Equipamento ou serviço"],
          gallery: [{ type: "image", title: "Registro do serviço", src: "/assets/premium/reforma.jpg" }]
        });
        renderServices();
      }
      if (add.dataset.add === "differentials") {
        content.servicesPage.differentials.push("Novo diferencial");
        renderDifferentials();
      }
      if (add.dataset.add === "gallery") {
        content.projectsPage.gallery.push({
          id: `media-${Date.now()}`,
          type: "image",
          title: "Novo projeto",
          tag: "Projeto",
          src: "/assets/premium/planta.jpg"
        });
        renderGallery();
      }
      if (add.dataset.add === "markets") {
        content.markets.push("Novo setor");
        renderMarkets();
      }
      if (add.dataset.add === "client") {
        content.clients.push({ name: "Novo cliente", image: "/assets/official/logo.png" });
        renderClients();
      }
      setDirty();
    }

    if (remove) {
      const index = Number(remove.dataset.index);
      if (remove.dataset.remove === "statements") content.home.statements.splice(index, 1);
      if (remove.dataset.remove === "numbers") content.home.numbers.splice(index, 1);
      if (remove.dataset.remove === "values") content.companyPage.values.splice(index, 1);
      if (remove.dataset.remove === "timeline") content.companyPage.timeline.splice(index, 1);
      if (remove.dataset.remove === "category") content.solutionsPage.categories.splice(index, 1);
      if (remove.dataset.remove === "service") content.servicesPage.services.splice(index, 1);
      if (remove.dataset.remove === "differentials") content.servicesPage.differentials.splice(index, 1);
      if (remove.dataset.remove === "gallery") content.projectsPage.gallery.splice(index, 1);
      if (remove.dataset.remove === "markets") content.markets.splice(index, 1);
      if (remove.dataset.remove === "client") content.clients.splice(index, 1);
      setDirty();
      renderAll();
    }

    if (clear) {
      write(clear.dataset.clear, "");
      setDirty();
    }
  });

  document.querySelector("#save").addEventListener("click", async () => {
    const response = await fetch("/admin/api/content", {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrf
      },
      body: JSON.stringify(content)
    });
    if (!response.ok) {
      window.alert("Não foi possível salvar o site.");
      return;
    }
    content = (await response.json()).content;
    setSaved();
  });

  window.addEventListener("beforeunload", (event) => {
    if (dirty) event.preventDefault();
  });

  bindFields();
  renderAll();
})();
