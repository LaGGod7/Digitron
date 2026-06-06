/**
 * Seed reviews data.
 * Future: fetched from backend API / database.
 */
const reviews = [
  { id: 1, product_id: 1, reviewer_name: "Ravi Kumar", rating: 5, review_text: "Excellent image quality even at night. Installation was straightforward. Very happy with the purchase!", created_at: "2024-11-20", is_verified: true, helpful_yes: 12, helpful_no: 1 },
  { id: 2, product_id: 1, reviewer_name: "Priya S", rating: 4, review_text: "Good camera. The app works well remotely. Only minor complaint is the mobile app could be better.", created_at: "2024-10-15", is_verified: true, helpful_yes: 7, helpful_no: 0 },
  { id: 3, product_id: 1, reviewer_name: "Anonymous", rating: 4, review_text: "Solid build quality. IR night vision is impressive. Worth the price.", created_at: "2024-09-02", is_verified: false, helpful_yes: 3, helpful_no: 0 },
  { id: 4, product_id: 2, reviewer_name: "Suresh M", rating: 4, review_text: "Good for the price. Clear daytime footage. Night vision range could be better.", created_at: "2024-11-01", is_verified: true, helpful_yes: 5, helpful_no: 1 },
];

export default reviews;
