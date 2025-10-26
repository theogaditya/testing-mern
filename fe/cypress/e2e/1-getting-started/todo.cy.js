/// <reference types="cypress" />

describe("App form submit", () => {
  const base = "http://localhost:5173";

  beforeEach(() => {
    cy.visit(base);
  });

  it("submits the form, sends correct JSON and resets fields on success", () => {
    cy.intercept("POST", "http://localhost:3001/v2", (req) => {
      req.continue();
    }).as("postV2");

    // fill form
    cy.get("#email").type("alice@example.com");
    cy.get("#name").type("Alice Wonderland");
    cy.get("#age").type(30);
    cy.get("#gender").select("FEMALE");

    cy.get("button[type=submit]").click();
    cy.wait("@postV2").its("request.body").should("deep.equal", {
      email: "alice@example.com",
      name: "Alice Wonderland",
      age: 30,
      gender: "FEMALE",
    });
    // on success your code calls e.currentTarget.reset()
    cy.get("#email").should("have.value", "");
    cy.get("#name").should("have.value", "");
    cy.get("#age").should("have.value", "");
    cy.get("#gender").should("have.value", "MALE");
  });
});
