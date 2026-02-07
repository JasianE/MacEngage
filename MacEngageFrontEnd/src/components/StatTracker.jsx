import { LineChart } from '@mui/x-charts/LineChart';

function StatTracker(){
    return (
        <LineChart
            xAxis={[{ data: [2,4,6,8,10] }]}
            series={[
                {
                data: [2, 5.5, 2, 8.5, 80, 5], // y axis
                },
            ]}
            height={300}
        />
    );
}

export default StatTracker;