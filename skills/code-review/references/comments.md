# Reference: How to Write Code Review Comments


---

## Summary

- Be kind
- Explain your reasoning
- Balance giving explicit directions with pointing out problems and letting the developer decide
- Encourage developers to simplify code or add comments rather than just explaining complexity to you

---

## Courtesy

Always be **courteous and respectful** while being clear and helpful.

**Comment on the code, not the developer.**

| ❌ Bad | ✅ Good |
|---|---|
| "Why did **you** use threads here when there's obviously no benefit to be gained from concurrency?" | "The concurrency model here is adding complexity to the system without any actual performance benefit that I can see. Because there's no performance benefit, it's best for this code to be single-threaded instead of using multiple threads." |

The bad version attacks the person. The good version describes the problem, explains the principle, and states what should be done — all without implying fault.

---

## Explain Why

When you make a comment, include why you're making it when it adds value:
- What best practice are you following?
- How does this suggestion improve code health?
- What is your intent?

You don't need to explain every comment, but explaining *why* helps the developer learn and avoids misunderstanding.

---

## Giving Guidance

**It is the developer's responsibility to fix the CL, not the reviewer's.** You are not required to design a solution or write code for them.

But being unhelpful is not the goal. Strike the right balance:

- **Point out the problem, let the developer decide** — helps them learn and often produces a better solution (they're closer to the code)
- **Give direct instructions or even code** — appropriate when the most efficient path to a good CL is a concrete suggestion

The primary goal is the best possible CL. A secondary goal is improving the developer's skills over time.

**Acknowledge good things too.** If you see something you like — great test coverage, a well-simplified algorithm, something you learned from — say so, and explain *why* it's good. Reinforcing good practices is as valuable as correcting mistakes.

---

## File and Line References

Every comment must include a precise location so collaborators can find the code without searching.

- **Always read the source file** to get the exact line number — do not guess or estimate.
- Format: `filename:line_number` (basename is sufficient for unambiguous files; use a path prefix when needed for clarity).
- Place the reference in the comment heading or immediately before the code snippet.

Example:
> `app/services/foo_service.rb:42` — This method has no nil guard. If `user` is nil here, `user.name` will raise.

---

## Severity Labels

Label your comments so authors know what's blocking vs. optional. Without labels, authors may treat every comment as mandatory.

| Label | Meaning |
|---|---|
| *(no label)* | Required — must be addressed before LGTM |
| `Nit:` | Minor polish; technically correct to do, but won't block approval |
| `Optional:` or `Consider:` | A good idea but not strictly required |
| `FYI:` | Not expected in this CL; informational for future thinking |

Examples:
> Nit: This variable name could be more descriptive, but up to you.
>
> Optional: Consider extracting this into a helper method for readability.
>
> FYI: There's a newer API for this that might be worth exploring in a future CL.

---

## Accepting Explanations

If you ask a developer to explain code you don't understand, the usual correct response is for them to **rewrite the code more clearly**.

Occasionally, adding a code comment is also appropriate — if it captures context that normal readers wouldn't already know.

**Explanations written only in the code review tool are not helpful to future readers.** They are acceptable only when you're unfamiliar with an area and the developer is explaining something domain-specific that other readers would already know.
