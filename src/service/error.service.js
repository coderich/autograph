class AutoGraphError extends Error {}

// Request Errors
exports.NotFoundError = class extends AutoGraphError {};
exports.BadRequestError = class extends AutoGraphError {};

// Rule Errors
class RuleError extends AutoGraphError {}
exports.AllowRuleError = class extends RuleError {};
exports.ImmutableRuleError = class extends RuleError {};
exports.EmailRuleError = class extends RuleError {};
exports.RangeRuleError = class extends RuleError {};
exports.RejectRuleError = class extends RuleError {};
exports.RequiredRuleError = class extends RuleError {};
exports.SelflessRuleError = class extends RuleError {};
