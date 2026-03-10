# WhatsApp Messaging Server Report

Generated: March 10, 2026  
Project root: `c:\xampp\htdocs\digital-hub`

## 1. Scope

This report covers all backend code paths involved in sending WhatsApp messages, a live test run, observed result, and reasons delivery may fail.

## 2. WhatsApp Sending Paths in the Server

There are **two active backend paths**:

1. **Direct Meta endpoint path (admin manual send)**
- Route: `server/src/routes/whatsapp.routes.ts`
- Schema: `server/src/schemas/whatsapp.schemas.ts`
- Service: `server/src/services/whatsappService.ts`
- Endpoint: `POST /api/whatsapp/send`
- Provider: Meta Cloud API only (`https://graph.facebook.com/v19.0`)

2. **Workflow/path used by admissions and operations**
- Utility: `server/src/utils/whatsapp.ts`
- Main function: `sendDigitalHubWhatsApp({ to, body })`
- Used from:
  - `server/src/services/applications.service.ts`
  - `server/src/services/programApplications.service.ts`
  - `server/src/services/auth.service.ts`
- Provider switch: `WHATSAPP_PROVIDER` (`meta` or `twilio`)

## 3. Configuration and Runtime Behavior

Relevant environment variables:

- `WHATSAPP_PROVIDER` (`meta` or `twilio`)
- `META_WA_TOKEN`
- `META_PHONE_NUMBER_ID`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_FROM`

Current server config indicates provider is set to `meta`.

Behavior notes:

- In `server/src/utils/whatsapp.ts`, if provider config is incomplete, it returns **mock mode** instead of throwing.
- In `server/src/services/whatsappService.ts`, missing Meta config returns structured failure (`WHATSAPP_NOT_CONFIGURED`).
- Direct route `/api/whatsapp/send` is protected by `verifyAdminAuth`.

## 4. Input Validation and Phone Format

- `/api/whatsapp/send` validates `to` with regex `^\\d+$` in `server/src/schemas/whatsapp.schemas.ts`.
- This means the API expects digits-only input (example: `96176461380`, not `+96176461380`).
- Frontend modal currently normalizes phone input to digits only before sending.

## 5. Message Persistence and Overview Mapping

- WhatsApp workflow messages are stored in `application_messages` using:
  - `channel = 'sms'`
  - metadata marker like `{"provider":"whatsapp"}`
- Overview logic maps those rows back to WhatsApp for reporting and filtering in:
  - `server/src/repositories/overview.repo.ts`

## 6. Live Test Executed

### Test performed

Function tested (workflow path):  
`sendDigitalHubWhatsApp({ to: "96176461380", body: "Digital Hub test..." })`

### Result

Test failed with provider error:

- Status: `401`
- Meta error type: `OAuthException`
- Meta error code: `190`
- Subcode: `463`
- Message: access token session expired

Observed backend error shape from utility path:

- `message`: `WHATSAPP_SEND_FAILED`
- `statusCode`: `502`
- `code`: `INTERNAL_ERROR` (see note below)

## 7. Why It Is Not Working (Confirmed + Likely Causes)

### Confirmed root cause from test

1. **Meta access token is expired**  
   The live API response explicitly says the session has expired.

### Additional causes that can also block delivery after token fix

1. Recipient is not allowed in Meta test mode (if app/number is not fully live).
2. Wrong `META_PHONE_NUMBER_ID` for the token/WABA.
3. Missing Meta permission (`whatsapp_business_messaging`) on the token.
4. Sending free-form text outside the allowed customer service window (Meta policy may require a template).
5. Number format mismatch if requests include `+` against digits-only schema.

## 8. Code Issues Affecting Debuggability

1. **Error code normalization issue**
- `server/src/utils/whatsapp.ts` throws `new AppError(502, "WHATSAPP_SEND_FAILED", ...)`
- But `WHATSAPP_SEND_FAILED` is not listed in `server/src/constants/errorCodes.ts`
- So `AppError` falls back to `code = "INTERNAL_ERROR"` and puts the real provider text in `details`
- Result: logs/API consumers see a generic code, which obscures root cause.

2. **Split implementation**
- Meta-only path (`whatsappService.ts`) and shared utility path (`utils/whatsapp.ts`) are separate.
- This can produce inconsistent behavior and different error shapes.

## 9. Fix Plan

1. Regenerate Meta token and update `META_WA_TOKEN`.
2. Verify `META_PHONE_NUMBER_ID` matches the same WhatsApp Business account.
3. Verify app permissions and app mode requirements in Meta developer console.
4. Keep sending phone numbers in digits-only format (`961...`) for current API schema.
5. Add `WHATSAPP_SEND_FAILED` (and optionally `WHATSAPP_NOT_CONFIGURED`) to `server/src/constants/errorCodes.ts`.
6. Unify both send paths to one internal implementation (recommended: shared utility used by route + workflows).

## 10. Quick Retest After Fix

Run from `server/`:

```bash
npx tsx -e "import 'dotenv/config'; import { sendDigitalHubWhatsApp } from './src/utils/whatsapp.ts'; (async ()=>{ try { const r = await sendDigitalHubWhatsApp({ to:'96176461380', body:'retest '+new Date().toISOString() }); console.log(r); } catch(e){ console.error(e); } })();"
```

Expected success (Meta):

- response includes `provider: "meta"`
- includes `message_id`
