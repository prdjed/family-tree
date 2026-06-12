import { familyData } from "../js/family-data.js";

const errors = [];
const ids = new Set();
const peopleById = new Map();

for (const person of familyData) {
  if (!person.id || typeof person.id !== "string") {
    errors.push("Every person must have a non-empty string ID.");
    continue;
  }
  if (ids.has(person.id)) {
    errors.push(`Duplicate ID: ${person.id}`);
  }
  ids.add(person.id);
  peopleById.set(person.id, person);
}

for (const person of familyData) {
  checkRelations(person, "parents", "children");
  checkRelations(person, "children", "parents");
  checkRelations(person, "spouses", "spouses");

  if (
    person.data?.biography !== undefined &&
    typeof person.data.biography !== "string"
  ) {
    errors.push(`${person.id} has a biography that is not text.`);
  }
}

const mainPeople = familyData.filter((person) => person.main);
if (mainPeople.length !== 1) {
  errors.push(`Expected exactly one main person, found ${mainPeople.length}.`);
}

const generatedPlaceholders = familyData.filter((person) => person.to_add);
const editorRecords = familyData.filter((person) => person._new_rel_data);
const unnamedPublishedPeople = familyData.filter(
  (person) =>
    !person.to_add &&
    !person._new_rel_data &&
    !person.data?.["first name"]?.trim() &&
    !person.data?.["last name"]?.trim(),
);

if (errors.length > 0) {
  console.error(`Family data validation failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Validated ${familyData.length} family records.`);
  console.log(`Generated Family Chart placeholders: ${generatedPlaceholders.length}`);
  console.log(`Editor records excluded from the public tree: ${editorRecords.length}`);
  console.log(`Published people without recorded names: ${unnamedPublishedPeople.length}`);
  console.log("All IDs and reciprocal relationships are valid.");
}

function checkRelations(person, relationType, reciprocalType) {
  const relationIds = person.rels?.[relationType] ?? [];
  for (const relationId of relationIds) {
    const relative = peopleById.get(relationId);
    if (!relative) {
      errors.push(
        `${person.id} has missing ${relationType} reference ${relationId}.`,
      );
      continue;
    }
    const reciprocalIds = relative.rels?.[reciprocalType] ?? [];
    if (!reciprocalIds.includes(person.id)) {
      errors.push(
        `${person.id} -> ${relationType} -> ${relationId} is not reciprocal.`,
      );
    }
  }
}
