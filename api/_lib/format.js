export function rowToPerson(r) {
  return {
    id: r.id,
    name: r.name,
    parentId: r.parent_id,
    gender: r.gender,
    birthYear: r.birth_year,
    deathYear: r.death_year,
    note: r.note,
    photoUrl: r.photo_url,
    sortOrder: r.sort_order,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}
