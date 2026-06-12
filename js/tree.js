import { familyData } from "./family-data.js";

const INITIAL_PERSON_ID = "ea95ed0b-e94a-4669-bcc7-f466148cc99d";
const MOBILE_DATA_BUTTON_MIN_ZOOM = 0.72;
const mobilePanelQuery = window.matchMedia("(max-width: 850px)");
const peopleById = new Map(familyData.map((person) => [person.id, person]));
const treeLayout = document.querySelector("#treeLayout");
const personPanel = document.querySelector("#personPanel");
const closePersonPanelButton = document.querySelector("#closePersonPanel");
const personSearchForm = document.querySelector("#personSearchForm");
const searchNameInput = document.querySelector("#searchName");
const searchFatherNameInput = document.querySelector("#searchFatherName");
const searchResultsPanel = document.querySelector("#searchResultsPanel");
const searchResultsTitle = document.querySelector("#searchResultsTitle");
const searchResultsSummary = document.querySelector("#searchResultsSummary");
const searchResults = document.querySelector("#searchResults");
const personPanelContent = document.querySelector("#personPanelContent");
const personName = document.querySelector("#personName");
const personDetails = document.querySelector("#personDetails");
const personBiographySection = document.querySelector(
  "#personBiographySection",
);
const personBiography = document.querySelector("#personBiography");
const personRelations = document.querySelector("#personRelations");
const proposalLink = document.querySelector("#personProposalLink");
const loadingMessage = document.querySelector("#treeLoading");
const helpDialog = document.querySelector("#helpDialog");
const openHelpButton = document.querySelector("#openHelpButton");

let chart;

try {
  createTree();
} catch (error) {
  console.error(error);
  loadingMessage.textContent =
    "Стабло није могло да се учита. Провјерите интернет везу и покушајте поново.";
}

openHelpButton.addEventListener("click", () => helpDialog.showModal());
closePersonPanelButton.addEventListener("click", closeSidePanel);
personSearchForm.addEventListener("submit", handleSearch);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !personPanel.hidden && !helpDialog.open) {
    closeSidePanel();
  }
});

function createTree() {
  const chartData = getPublishedFamilyData();

  chart = f3
    .createChart("#FamilyChart", chartData)
    .setTransitionTime(700)
    .setCardXSpacing(250)
    .setCardYSpacing(150)
    .setSingleParentEmptyCard(true, { label: "Непознато" })
    .setShowSiblingsOfMain(false)
    .setOrientationVertical();

  chart
    .setProgenyDepth(1)
    .setCardHtml()
    .setCardDisplay([["first name", "last name"], ["birthday"]])
    .setCardDim(null)
    .setMiniTree(true)
    .setStyle("imageRect")
    .setOnHoverPathToMain()
    .setOnCardUpdate(addMobileDataButton)
    .setOnCardClick((_event, datum) => selectCardPerson(datum.data.id));

  setupMobileDataButtonZoom();

  if (chartData.some((person) => person.id === INITIAL_PERSON_ID)) {
    chart.updateMainId(INITIAL_PERSON_ID);
  }

  chart.updateTree({ initial: true });
  loadingMessage.hidden = true;
}

function selectCardPerson(personId) {
  if (!mobilePanelQuery.matches) {
    selectPerson(personId);
    return;
  }

  const person = peopleById.get(personId);
  if (!person || person.to_add || person._new_rel_data) {
    return;
  }

  chart.updateMainId(personId);
  requestAnimationFrame(() => {
    chart.updateTree({ initial: false, tree_position: "main_to_middle" });
  });
}

function selectPerson(personId) {
  const person = peopleById.get(personId);
  if (!person || person.to_add || person._new_rel_data) {
    return;
  }

  showPerson(personId);
  chart.updateMainId(personId);
  requestAnimationFrame(() => {
    chart.updateTree({ initial: false, tree_position: "main_to_middle" });
  });
}

function addMobileDataButton(datum) {
  const person = datum.data;
  if (!isPublishedPerson(person)) {
    return;
  }

  const card = this.querySelector(".card");
  if (!card) {
    return;
  }

  const button = document.createElement("button");
  button.className = "mobile-card-data-button";
  button.type = "button";
  button.textContent = "i";
  button.title = "Прикажи податке";
  button.setAttribute("aria-label", `Прикажи податке: ${getPersonName(person)}`);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    showPerson(person.id);
  });
  card.append(button);
}

function setupMobileDataButtonZoom() {
  const zoomSurface = document.querySelector("#FamilyChart #f3Canvas");
  const zoom = zoomSurface?.__zoomObj;
  if (!zoomSurface || !zoom) {
    return;
  }

  let buttonsVisible;
  const updateVisibility = (scale) => {
    const shouldShow = scale >= MOBILE_DATA_BUTTON_MIN_ZOOM;
    if (shouldShow === buttonsVisible) {
      return;
    }

    buttonsVisible = shouldShow;
    document
      .querySelector("#FamilyChart")
      .classList.toggle("mobile-data-buttons-visible", shouldShow);
  };

  zoom.on("zoom.mobileDataButtons", (event) => {
    updateVisibility(event.transform.k);
  });
  updateVisibility(d3.zoomTransform(zoomSurface).k);
}

function showPerson(personId) {
  const person = peopleById.get(personId);
  if (!person) {
    return;
  }

  openSidePanel();
  searchResultsPanel.hidden = true;
  personPanelContent.hidden = false;
  personName.textContent = getPersonName(person);
  proposalLink.href = getProposalUrl(person.id);

  personDetails.replaceChildren();
  addDetail("Пол", getGenderLabel(person.data.gender));
  addDetail("Рођење", person.data.birthday || "Није наведено");

  const biography = person.data.biography?.trim() ?? "";
  personBiographySection.hidden = biography.length === 0;
  personBiography.textContent = biography;

  personRelations.replaceChildren();
  addRelationGroup("Родитељи", person.rels.parents);
  addRelationGroup("Супружници", person.rels.spouses);
  addRelationGroup("Дјеца", person.rels.children);
}

function handleSearch(event) {
  event.preventDefault();

  const searchedName = normalizeName(searchNameInput.value);
  const searchedFatherName = normalizeName(searchFatherNameInput.value);
  if (!searchedName) {
    searchNameInput.focus();
    return;
  }

  const matches = familyData
    .filter(isPublishedPerson)
    .filter((person) => nameMatches(person, searchedName))
    .filter((person) => {
      if (!searchedFatherName) {
        return true;
      }
      const father = getFather(person);
      return father ? nameMatches(father, searchedFatherName) : false;
    })
    .map((person) => ({
      person,
      path: getPaternalPath(person),
    }))
    .sort(compareSearchResults);

  renderSearchResults(matches, searchNameInput.value.trim());
}

function renderSearchResults(matches, searchedName) {
  openSidePanel();
  personPanelContent.hidden = true;
  searchResultsPanel.hidden = false;
  searchResults.replaceChildren();

  searchResultsTitle.textContent = `Резултати за „${searchedName}”`;
  searchResultsSummary.textContent =
    matches.length === 1
      ? "Пронађена је 1 особа."
      : `Пронађено је ${matches.length} особа.`;

  if (matches.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "search-empty";
    emptyMessage.textContent =
      "Нема резултата. Провјерите име или покушајте без имена оца.";
    searchResults.append(emptyMessage);
    return;
  }

  for (const match of matches) {
    const button = document.createElement("button");
    button.className = "search-result";
    button.type = "button";
    button.setAttribute(
      "aria-label",
      `Прикажи у стаблу: ${getPersonName(match.person)}`,
    );

    for (const [index, ancestor] of match.path.entries()) {
      const name = document.createElement("span");
      name.textContent = getFirstName(ancestor);
      if (index === match.path.length - 1) {
        name.className = "search-result-person";
      }
      button.append(name);

      if (index < match.path.length - 1) {
        const separator = document.createElement("span");
        separator.className = "search-result-separator";
        separator.textContent = "›";
        separator.setAttribute("aria-hidden", "true");
        button.append(separator);
      }
    }

    button.addEventListener("click", () => selectSearchResult(match.person.id));
    searchResults.append(button);
  }
}

function selectSearchResult(personId) {
  if (!mobilePanelQuery.matches) {
    selectPerson(personId);
    return;
  }

  closeSidePanel();
  chart.updateMainId(personId);
  requestAnimationFrame(() => {
    chart.updateTree({ initial: false, tree_position: "main_to_middle" });
  });
}

function addDetail(label, value) {
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  personDetails.append(term, description);
}

function addRelationGroup(label, relationIds) {
  const relations = relationIds
    .map((id) => peopleById.get(id))
    .filter((person) => person && !person.to_add && !person._new_rel_data);

  if (relations.length === 0) {
    return;
  }

  const group = document.createElement("section");
  group.className = "relation-group";
  const heading = document.createElement("h3");
  const list = document.createElement("div");
  heading.textContent = label;
  list.className = "relation-list";

  for (const relation of relations) {
    const button = document.createElement("button");
    button.className = "relation-button";
    button.type = "button";
    button.textContent = getPersonName(relation);
    button.addEventListener("click", () => selectPerson(relation.id));
    list.append(button);
  }

  group.append(heading, list);
  personRelations.append(group);
}

function getPersonName(person) {
  const firstName = getFirstName(person);
  const lastName = person.data["last name"]?.trim() ?? "";
  return [firstName, lastName].filter(Boolean).join(" ") || "Непозната особа";
}

function getFirstName(person) {
  return person.data["first name"]?.trim() || "Непознато";
}

function getGenderLabel(gender) {
  if (gender === "M") {
    return "Мушки";
  }
  if (gender === "F") {
    return "Женски";
  }
  return "Није наведено";
}

function getProposalUrl(personId) {
  return `./proposal.html?personId=${encodeURIComponent(personId)}`;
}

function openSidePanel() {
  const wasHidden = personPanel.hidden;
  personPanel.hidden = false;
  treeLayout.classList.remove("panel-hidden");

  if (wasHidden && mobilePanelQuery.matches) {
    requestAnimationFrame(() => {
      closePersonPanelButton.focus({ preventScroll: true });
    });
  } else if (wasHidden) {
    requestAnimationFrame(() => {
      chart?.updateTree({
        initial: false,
        tree_position: "inherit",
        transition_time: 0,
      });
    });
  }
}

function closeSidePanel() {
  personPanel.hidden = true;
  treeLayout.classList.add("panel-hidden");

  requestAnimationFrame(() => {
    chart?.updateTree({
      initial: false,
      tree_position: "inherit",
      transition_time: 0,
    });
  });
}

function isPublishedPerson(person) {
  return (
    !person.to_add &&
    !person._new_rel_data &&
    !person.unknown &&
    Boolean(person.data?.["first name"]?.trim())
  );
}

function getFather(person) {
  return person.rels.parents
    .map((parentId) => peopleById.get(parentId))
    .find((parent) => parent?.data?.gender === "M");
}

function getPaternalPath(person) {
  const path = [];
  const visitedIds = new Set();
  let currentPerson = person;

  while (currentPerson && !visitedIds.has(currentPerson.id)) {
    visitedIds.add(currentPerson.id);
    path.unshift(currentPerson);
    currentPerson = getFather(currentPerson);
  }

  return path;
}

function nameMatches(person, normalizedSearch) {
  const normalizedName = normalizeName(person.data["first name"]);
  const nameParts = normalizedName.split(" ").filter(Boolean);
  return (
    normalizedName === normalizedSearch || nameParts.includes(normalizedSearch)
  );
}

function normalizeName(value = "") {
  const cyrillicToLatin = {
    а: "a",
    б: "b",
    в: "v",
    г: "g",
    д: "d",
    ђ: "dj",
    е: "e",
    ж: "z",
    з: "z",
    и: "i",
    ј: "j",
    к: "k",
    л: "l",
    љ: "lj",
    м: "m",
    н: "n",
    њ: "nj",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    ћ: "c",
    у: "u",
    ф: "f",
    х: "h",
    ц: "c",
    ч: "c",
    џ: "dz",
    ш: "s",
  };

  return value
    .trim()
    .toLocaleLowerCase("sr")
    .replace(/đ/g, "dj")
    .replace(/[абвгдђежзијклљмнњопрстћуфхцчџш]/g, (letter) => {
      return cyrillicToLatin[letter];
    })
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compareSearchResults(firstResult, secondResult) {
  if (firstResult.path.length !== secondResult.path.length) {
    return firstResult.path.length - secondResult.path.length;
  }
  return firstResult.path
    .map(getFirstName)
    .join(" ")
    .localeCompare(secondResult.path.map(getFirstName).join(" "), "sr");
}

function getPublishedFamilyData() {
  const editorRecordIds = new Set(
    familyData
      .filter((person) => person._new_rel_data)
      .map((person) => person.id),
  );

  return structuredClone(
    familyData
      .filter((person) => !editorRecordIds.has(person.id))
      .map((person) => ({
        ...person,
        rels: {
          parents: person.rels.parents.filter((id) => !editorRecordIds.has(id)),
          children: person.rels.children.filter(
            (id) => !editorRecordIds.has(id),
          ),
          spouses: person.rels.spouses.filter((id) => !editorRecordIds.has(id)),
        },
      })),
  );
}
