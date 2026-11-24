# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

## Build runtime

Use Node.js 24 for this project. The `.node-version` file selects it for nodenv; ensure nodenv is initialized in the deploy shell and run the build from the project root.

```sh
npm ci
npm run build
```

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Delivery reports

The protected Reports page calls `GET /api/shipping/reports/summary` and
`GET /api/shipping/reports/courier-performance` through the shared authenticated
API client. Both endpoints accept optional `fromDate`, `toDate`, and `courierId`
query parameters. The courier filter loads delivery men, displays their names,
and submits the selected courier ID. The date range is validated before
requests are updated, and the results view adapts to the JSON response because
the API specification does not define response schemas.

## Live delivery tracking

The Delivery Men page loads courier coordinates from `GET /api/shipping/delivery-men`, listens for `delivery:location_changed`, and joins the `order:track` room when active order IDs are included for a driver. It listens for `order:courier_location` and leaves those rooms when the page is closed. The fleet map renders active courier locations as a heatmap and marks only drivers with active orders, using `activeOrdersCount` when the API reports a count without order details. The order detail page joins its `order:track` room and listens for `order:courier_location`, `order:picked_up`, and `order:delivered`; it leaves the room when the page is closed. Both views authenticate the Socket.IO connection with the saved JWT and render courier, branch, and destination coordinates on an OpenStreetMap-backed Leaflet map.

The Socket.IO client connects to the API origin configured in `src/api.js`. The backend must expose Socket.IO on that origin, authenticate the token supplied in the handshake `auth.token`, automatically join the authenticated shipping-company room, and authorize order-room subscriptions. Location events should include numeric or numeric-string `lat` and `lng` values; order location events should include the order's courier ID when available. The delivery-men response may provide `activeOrdersCount` to identify assigned drivers; order-room subscriptions require order IDs or objects in an `activeOrders` array.
