const BASE_URL = "http://localhost:6969";

export const getNotes = async () => {
  const response = await fetch(`${BASE_URL}/notes/list`);

  if (!response.ok) {
    throw new Error("Failed to fetch notes");
  }

  const result = await response.json();

  return result.data;
};

export const createNote = async ({
  title,
  content,
  archived = false,
  deleted = false,
}) => {
  const response = await fetch(`${BASE_URL}/add/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      content,
      archived,
      deleted,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create note");
  }

  const result = await response.json();

  return result.data;
};

export const updateNote = async (_id, noteData) => {
  const response = await fetch(
    `http://localhost:6969/update/notes/${_id}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(noteData),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update note");
  }

  const result = await response.json();

  return result.data;
};

export const permanentDelete = async (_id) => {
  const response = await fetch(`http://localhost:6969/delete/notes/${_id}`, {
    method: "DELETE",
  });

  if (!response.ok) throw new Error("Failed to permanently delete note");

  const result = await response.json();
  return result.data;
};