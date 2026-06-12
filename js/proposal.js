import { familyData } from "./family-data.js";
import {
  isFirebaseConfigured,
  submitProposal,
  validateImage,
} from "./firebase-service.js";

const query = new URLSearchParams(window.location.search);
const personId = query.get("personId");
const person = familyData.find(
  (entry) =>
    entry.id === personId &&
    !entry.to_add &&
    !entry._new_rel_data &&
    !entry.unknown,
);

const loading = document.querySelector("#proposalLoading");
const invalidPerson = document.querySelector("#invalidPerson");
const content = document.querySelector("#proposalContent");
const form = document.querySelector("#proposalForm");
const messageInput = document.querySelector("#proposalMessage");
const imageInput = document.querySelector("#proposalImage");
const dropZone = document.querySelector("#dropZone");
const selectedFile = document.querySelector("#selectedFile");
const status = document.querySelector("#formStatus");
const submitButton = document.querySelector("#submitButton");
const successPanel = document.querySelector("#successPanel");

let selectedImage = null;

loading.hidden = true;

if (!person) {
  invalidPerson.hidden = false;
} else {
  setupPerson();
  setupForm();
  content.hidden = false;
}

function setupPerson() {
  const displayName = getPersonName(person);
  document.title = `Предлог за ${displayName}`;
  document.querySelector("#proposalPersonName").textContent = displayName;
  document.querySelector("#publishedName").textContent = displayName;
  document.querySelector("#publishedBirthday").textContent = person.data.birthday
    ? `Рођење: ${person.data.birthday}`
    : "Датум рођења није наведен";
}

function setupForm() {
  dropZone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      imageInput.click();
    }
  });

  for (const eventName of ["dragenter", "dragover"]) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.add("is-dragging");
    });
  }

  for (const eventName of ["dragleave", "drop"]) {
    dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      dropZone.classList.remove("is-dragging");
    });
  }

  dropZone.addEventListener("drop", (event) => {
    const [file] = event.dataTransfer.files;
    setSelectedImage(file);
  });

  imageInput.addEventListener("change", () => {
    setSelectedImage(imageInput.files[0] ?? null);
  });

  form.addEventListener("submit", handleSubmit);

  if (!isFirebaseConfigured()) {
    setStatus(
      "Преглед форме ради, али слање чека Firebase подешавање у js/firebase-config.js.",
      "error",
    );
  }
}

function setSelectedImage(file) {
  try {
    validateImage(file);
    selectedImage = file;
    selectedFile.hidden = !file;
    selectedFile.textContent = file
      ? `Изабрана фотографија: ${file.name}`
      : "";
    setStatus("");
  } catch (error) {
    selectedImage = null;
    imageInput.value = "";
    selectedFile.hidden = true;
    setStatus(error.message, "error");
  }
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!form.reportValidity()) {
    return;
  }

  const message = messageInput.value.trim();
  if (message.length < 10) {
    setStatus("Предлог мора имати најмање 10 знакова.", "error");
    messageInput.focus();
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Слање...";
  setStatus("Чување предлога...");

  try {
    await submitProposal({
      personId: person.id,
      message,
      image: selectedImage,
    });
    form.hidden = true;
    successPanel.hidden = false;
  } catch (error) {
    console.error(error);
    setStatus(
      error.message || "Предлог није послат. Покушајте поново.",
      "error",
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Пошаљи предлог";
  }
}

function setStatus(message, type = "") {
  status.textContent = message;
  status.className = "form-status";
  if (type) {
    status.classList.add(`is-${type}`);
  }
}

function getPersonName(entry) {
  const firstName = entry.data["first name"]?.trim() ?? "";
  const lastName = entry.data["last name"]?.trim() ?? "";
  return [firstName, lastName].filter(Boolean).join(" ") || "Непозната особа";
}
