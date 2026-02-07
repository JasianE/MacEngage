import { LineChart } from "@mui/x-charts/LineChart";

function StatTracker() {
  return (
    <LineChart
      xAxis={[
        {
          data: [2, 4, 6, 8, 10],
          style: { color: "white" }, // x-axis labels white
        },
      ]}
      yAxis={[
        {
          style: { color: "white" }, // y-axis labels white
        },
      ]}
      series={[
        {
          data: [2, 5.5, 2, 8.5, 80, 5],
          color: "#3b82f6", // line color (blue)
        },
      ]}
      height={300}
      sx={{
        "& .MuiChartsAxis-root text": {
          fill: "white", // ensure axis labels are white
        },
      }}
    />
  );
}

export default StatTracker;
