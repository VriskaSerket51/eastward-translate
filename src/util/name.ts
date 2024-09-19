export function getProfileName() {
  let name = localStorage.getItem("profile_name");

  if (!name) {
    name = `Anonymous${Math.floor(Math.random() * 1000)}`;
    localStorage.setItem("profile_name", name);
  }

  return name;
}

export function setProfileName(name: string) {
  localStorage.setItem("profile_name", name);
}
