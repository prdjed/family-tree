import { familyData } from "./family-data.js";

const INITIAL_PERSON_ID = "0";
const peopleById = new Map(familyData.map((person) => [person.id, person]));
const treeLayout = document.querySelector("#treeLayout");
const personPanel = document.querySelector("#personPanel");
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
    .setCardHtml()
    .setCardDisplay([["first name", "last name"], ["birthday"]])
    .setCardDim(null)
    .setMiniTree(true)
    .setStyle("imageRect")
    .setOnHoverPathToMain()
    .setOnCardClick((_event, datum) => selectPerson(datum.data.id));

  if (chartData.some((person) => person.id === INITIAL_PERSON_ID)) {
    chart.updateMainId(INITIAL_PERSON_ID);
  }

  chart.updateTree({ initial: true });
  loadingMessage.hidden = true;
}

function selectPerson(personId) {
  const person = peopleById.get(personId);
  if (!person || person.to_add || person._new_rel_data) {
    return;
  }

  chart.updateMainId(personId);
  chart.updateTree({ initial: false, tree_position: "main_to_middle" });
  showPerson(personId);
}

function showPerson(personId) {
  const person = peopleById.get(personId);
  if (!person) {
    return;
  }

  personPanel.hidden = false;
  treeLayout.classList.remove("panel-hidden");
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
  const firstName = person.data["first name"]?.trim() ?? "";
  const lastName = person.data["last name"]?.trim() ?? "";
  return [firstName, lastName].filter(Boolean).join(" ") || "Непозната особа";
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
          children: person.rels.children.filter((id) => !editorRecordIds.has(id)),
          spouses: person.rels.spouses.filter((id) => !editorRecordIds.has(id)),
        },
      })),
  );
}
