import AppTitle from "@/components/appTitle";
import DataSetList from "@/components/dataSetList";

export default function DataSetsPage() {
  return (
    <>
      <AppTitle title="Data sets" />
      <DataSetList
        dataSets={[
          {
            id: 0,
            name: "UpCharge rents, users and venues",
            sourceWorkspace: "UpCharge",
            status: "private",
            parts: [
              "UpCharge venues with revenue, type, average rent cost and amount of daily rentals",
              "Venue performance by venue type",
              "Venue sales by partner",
              "All rentals with Stripe invoices",
            ],
          },
          {
            id: 1,
            name: "UpCharge locations",
            sourceWorkspace: "UpCharge",
            status: "public",
            parts: ["UpCharge venues"],
          },
          {
            id: 2,
            name: "Restaurants in Finland",
            sourceWorkspace: "TripAdvisor",
            status: "connected",
            parts: [
              "Helsinki",
              "Espoo",
              "Vantaa",
              "Tampere",
              "Turku",
              "Oulu",
              "Rovaniemi",
              "Kuopio",
              "Jyväskylä",
              "Lahti",
              "Pori",
              "Vaasa",
              "Kotka",
              "Joensuu",
              "Lappeenranta",
              "Hämeenlinna",
              "Porvoo",
              "Mikkeli",
              "Hyvinkää",
              "Nurmijärvi",
              "Järvenpää",
              "Kerava",
              "Kajaani",
              "Salo",
              "Kouvola",
              "Kokkola",
              "Lohja",
              "Riihimäki",
              "Seinäjoki",
              "Vihti",
              "Savonlinna",
              "Imatra",
              "Kangasala",
              "Varkaus",
              "Kemi",
              "Iisalmi",
              "Raisio",
              "Raahe",
            ],
          },
        ]}
      />
    </>
  );
}
