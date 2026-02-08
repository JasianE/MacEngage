import { LineChart } from "@mui/x-charts/LineChart";

function StatTracker({ engagementArray, timeArray, color = "white" }) {
  return (
    <LineChart
      xAxis={[
        {
          data: timeArray,
          label: "Time",
          labelStyle: {
            fill: color,
            fontWeight: "bold",
          },
        },
      ]}
      yAxis={[
        {
          label: "Engagement Score",
          labelStyle: {
            fill: color,
            fontWeight: "bold",
          },
        },
      ]}
      series={[
        {
          data: engagementArray,
          color: "#3b82f6",
          showMark: false, 
        },
      ]}
      height={300}
      sx={{
        "& .MuiChartsAxis-root text": {
          fill: color,
        },
        "& .MuiChartsAxis-label": {
          fill: color,
          fontWeight: "bold",
        },
      }}
    />
  );
}

export default StatTracker;
