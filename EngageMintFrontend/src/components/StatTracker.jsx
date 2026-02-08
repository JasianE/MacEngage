import { LineChart } from "@mui/x-charts/LineChart";

function StatTracker({ engagementArray, timeArray, color = "white" }) {
  return (
    <LineChart
      margin={{ left: 46, right: 18, top: 16, bottom: 34 }}
      xAxis={[
        {
          data: timeArray,
          label: "",
          labelStyle: {
            fill: color,
            fontWeight: "bold",
          },
        },
      ]}
      yAxis={[
        {
          label: "",
          labelStyle: {
            fill: color,
            fontWeight: "bold",
          },
        },
      ]}
      series={[
        {
          data: engagementArray,
          color: "#10b981",
          showMark: false,
          area: true,
        },
      ]}
      height={420}
      sx={{
        "& .MuiChartsAxis-root text": {
          fill: color,
          fontSize: 12,
        },
        "& .MuiChartsAxis-label": {
          fill: color,
          fontWeight: "bold",
        },
        "& .MuiChartsAxis-line": {
          stroke: "#dbe4ef",
        },
        "& .MuiChartsAxis-tick": {
          stroke: "#dbe4ef",
        },
        "& .MuiChartsGrid-line": {
          stroke: "#e9eef5",
        },
        "& .MuiAreaElement-root": {
          fill: "#10b981",
          fillOpacity: 0.12,
        },
      }}
    />
  );
}

export default StatTracker;
