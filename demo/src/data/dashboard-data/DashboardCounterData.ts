interface DataType {
   id: number;
   icon: string;
   count: number;
   title: string;
}[];

const dashboard_count_data: DataType[] = [
   {
      id: 1,
      icon: "skillgro-book",
      count: 30,
      title: "Enrolled Courses",
   },
   {
      id: 2,
      icon: "skillgro-tutorial",
      count: 10,
      title: "Active Courses",
   },
   {
      id: 3,
      icon: "skillgro-diploma-1",
      count: 7,
      title: "Completed Courses",
   },
   {
      id: 4,
      icon: "skillgro-group",
      count: 160,
      title: "Total Students",
   },
   {
      id: 5,
      icon: "skillgro-notepad",
      count: 30,
      title: "Total Courses",
   },
   {
      id: 6,
      icon: "skillgro-dollar-currency-symbol",
      count: 29000,
      title: "Total Earnings",
   },
];

export default dashboard_count_data;